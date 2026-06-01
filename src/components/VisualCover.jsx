function VisualCover({ image }) {
    if (!image) {
        return <div className="imagePlaceholder" />;
    }
    return (
            <img src={image || null} alt="" className="visualCoverImage" />
    );
}
export default VisualCover;