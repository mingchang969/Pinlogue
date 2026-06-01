export interface Env {
	IMAGES: R2Bucket;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: corsHeaders(),
			});
		}

		if (request.method === "GET" && url.pathname === "/") {
			return json({
				ok: true,
				message: "Pinlogue Worker is running",
			});
		}

		if (request.method === "GET" && url.pathname.startsWith("/image/")) {
			const key = decodeURIComponent(url.pathname.replace("/image/", ""));

			if (!key) {
				return json({ ok: false, error: "缺少圖片 key" }, 400);
			}

			const object = await env.IMAGES.get(key);

			if (!object) {
				return json({ ok: false, error: "找不到圖片" }, 404);
			}

			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set("etag", object.httpEtag);
			headers.set("Access-Control-Allow-Origin", "*");

			return new Response(object.body, {
				headers,
			});
		}

		if (request.method === "POST" && url.pathname === "/upload") {
			try {
				if (!env.IMAGES) {
					return json({ ok: false, error: "R2 bucket binding IMAGES 未設定成功" }, 500);
				}

				const formData = await request.formData();
				const file = formData.get("file");
				const type = formData.get("type");

				if (!(file instanceof File)) {
					return json({ ok: false, error: "缺少 file 欄位" }, 400);
				}

				const folder =
					type === "trip"
						? "trip"
						: type === "poi"
							? "poi"
							: "map";

				const ext = getExtension(file.name);
				const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;

				await env.IMAGES.put(key, file.stream(), {
					httpMetadata: {
						contentType: file.type || "application/octet-stream",
					},
				});

				const imageUrl = `${url.origin}/image/${encodeURIComponent(key)}`;

				return json({
					ok: true,
					key,
					url: imageUrl,
					filename: file.name,
					contentType: file.type,
				});
			} catch (error) {
				return json(
					{
						ok: false,
						error: error instanceof Error ? error.message : "上傳失敗",
					},
					500,
				);
			}
		}

		if (request.method === "DELETE" && url.pathname === "/delete") {
			try {
				const body = (await request.json()) as { key?: string };

				if (!body.key) {
					return json({ ok: false, error: "缺少 key" }, 400);
				}

				await env.IMAGES.delete(body.key);

				return json({
					ok: true,
					deletedKey: body.key,
				});
			} catch (error) {
				return json(
					{
						ok: false,
						error: error instanceof Error ? error.message : "刪除失敗",
					},
					500,
				);
			}
		}

		if (request.method === "GET" && url.pathname === "/cleanup-orphans") {
			try {
				const confirm = url.searchParams.get("confirm");
				const dryRun = url.searchParams.get("dryRun") === "true";

				// 安全鎖
				if (confirm !== "yes") {
					return json({
						ok: false,
						message: "請加上 ?confirm=yes 才會真的執行清理",
					}, 400);
				}

				// 1️⃣ 取得 Firestore keys
				const keyRes = await fetch(
					"https://us-central1-pinlogue-92255.cloudfunctions.net/getImageKeys"
				);

				const keyData = await keyRes.json() as {
					ok?: boolean;
					keys?: string[];
					error?: string;
				};

				if (!keyRes.ok || !keyData.ok || !Array.isArray(keyData.keys)) {
					return json({
						ok: false,
						error: keyData.error || "無法取得 Firestore image keys",
					}, 500);
				}

				const usedKeys = new Set(keyData.keys);

				// 2️⃣ 列出 R2 所有檔案
				const listed = await env.IMAGES.list();

				const orphanKeys: string[] = [];
				const keptKeys: string[] = [];

				for (const obj of listed.objects) {
					const key = obj.key;

					if (usedKeys.has(key)) {
						keptKeys.push(key);
					} else {
						orphanKeys.push(key);
					}
				}

				// 3️⃣ dry-run（只看不刪）
				if (dryRun) {
					return json({
						ok: true,
						mode: "dry-run",
						totalInR2: listed.objects.length,
						usedKeyCount: usedKeys.size,
						orphanCount: orphanKeys.length,
						orphanKeys,
					});
				}

				// 4️⃣ 真正刪除
				for (const key of orphanKeys) {
					await env.IMAGES.delete(key);
				}

				return json({
					ok: true,
					mode: "delete",
					totalInR2: listed.objects.length,
					deletedCount: orphanKeys.length,
					deletedKeys: orphanKeys,
				});
			} catch (error) {
				return json(
					{
						ok: false,
						error: error instanceof Error ? error.message : "cleanup failed",
					},
					500,
				);
			}
		}

		return json({ ok: false, error: "Not Found" }, 404);
	},
};

function corsHeaders(): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...corsHeaders(),
		},
	});
}

function getExtension(filename: string): string {
	const dotIndex = filename.lastIndexOf(".");
	return dotIndex >= 0 ? filename.slice(dotIndex) : "";
}