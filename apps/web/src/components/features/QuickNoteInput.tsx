import Textarea from "../ui/Textarea";

interface QuickNoteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const QuickNoteInput = ({ value, onChange, placeholder }: QuickNoteInputProps) => (
  <div>
    <p className="text-sm font-semibold text-slate-700">Anything to note?</p>
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder || "Short notes, context, or highlights from today."}
      rows={4}
      className="mt-3 text-sm"
    />
  </div>
);

export default QuickNoteInput;
