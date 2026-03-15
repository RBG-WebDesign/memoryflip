import { Composition } from "remotion";
import { CardReveal } from "./compositions/CardReveal";
import { ScorePopup } from "./compositions/ScorePopup";
import { ProductShowcase } from "./compositions/ProductShowcase";
import { AtomAnimation } from "./compositions/AtomAnimation";
import { CardSheen } from "./compositions/CardSheen";
import { CardSheenLoop } from "./compositions/CardSheenLoop";
import { MemoryFlipLogo } from "./compositions/MemoryFlipLogo";
import { MemoryFlipLogoIntro } from "./compositions/MemoryFlipLogoIntro";
import { MemoryFlipLogoLoop } from "./compositions/MemoryFlipLogoLoop";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="CardReveal"
        component={CardReveal}
        durationInFrames={90}
        fps={30}
        width={400}
        height={560}
        defaultProps={{ iconIndex: 0 }}
      />
      <Composition
        id="ScorePopup"
        component={ScorePopup}
        durationInFrames={45}
        fps={30}
        width={300}
        height={200}
        defaultProps={{ score: 150, combo: 3 }}
      />
      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ product: "HBM4" }}
      />
      <Composition
        id="AtomAnimation"
        component={AtomAnimation}
        durationInFrames={90}
        fps={30}
        width={512}
        height={512}
        defaultProps={{ orbitSpeed: 1 }}
      />
      <Composition
        id="CardSheen"
        component={CardSheen}
        durationInFrames={120}
        fps={30}
        width={400}
        height={560}
        defaultProps={{ variant: "both" as const }}
      />
      <Composition
        id="CardSheenMetallic"
        component={CardSheen}
        durationInFrames={60}
        fps={30}
        width={400}
        height={560}
        defaultProps={{ variant: "metallic" as const }}
      />
      <Composition
        id="CardSheenGold"
        component={CardSheen}
        durationInFrames={60}
        fps={30}
        width={400}
        height={560}
        defaultProps={{ variant: "gold" as const }}
      />
      <Composition
        id="CardSheenLoop"
        component={CardSheenLoop}
        durationInFrames={60}
        fps={30}
        width={320}
        height={448}
      />
      <Composition
        id="MemoryFlipLogo"
        component={MemoryFlipLogo}
        durationInFrames={1}
        fps={30}
        width={800}
        height={360}
      />
      <Composition
        id="MemoryFlipLogoIntro"
        component={MemoryFlipLogoIntro}
        durationInFrames={60}
        fps={30}
        width={800}
        height={360}
      />
      <Composition
        id="MemoryFlipLogoLoop"
        component={MemoryFlipLogoLoop}
        durationInFrames={90}
        fps={30}
        width={800}
        height={360}
      />
    </>
  );
};
