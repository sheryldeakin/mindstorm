import type { Emotion } from "../../types/journal";
import Chip from "../ui/Chip";

interface EmotionChipsProps {
  emotions: Emotion[];
  active?: string;
}

const EmotionChips = ({ emotions, active }: EmotionChipsProps) => (
  <div className="flex flex-wrap gap-3">
    {emotions.map((emotion) => (
      <Chip key={emotion.label} active={emotion.label === active}>
        {emotion.label} - {emotion.intensity}%
      </Chip>
    ))}
  </div>
);

export default EmotionChips;
