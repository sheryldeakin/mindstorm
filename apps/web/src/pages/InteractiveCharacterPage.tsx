import PageHeader from "../components/layout/PageHeader";
import MindstormScene from "../components/avatar/MindstormScene";

const InteractiveCharacterPage = () => {
  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="interactive-character" />
      <MindstormScene />
    </div>
  );
};

export default InteractiveCharacterPage;
