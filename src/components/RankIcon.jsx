import { ReactComponent as FirstMedal } from "../images/FirstMedal.svg"
import { ReactComponent as SecondMedal } from "../images/SecondMedal.svg"
import { ReactComponent as ThirdMedal } from "../images/ThirdMedal.svg"
import { ReactComponent as Arrow } from "../images/Arrow_1.svg"
import { ReactComponent as Flat } from "../images/Flat.svg"

function RankIcon({ rank, lastRank }) {
    if (rank === 1) return <FirstMedal />;
    if (rank === 2) return <SecondMedal />;
    if (rank === 3) return <ThirdMedal />;
    if (rank < lastRank) return <Arrow style={{ color: "#AFE4A2" }} />;
    if (rank > lastRank) return <Arrow style={{ color: "#FF8C8C", transform: "rotate(180deg)" }} />;
    return <Flat />;
}

export default RankIcon;
