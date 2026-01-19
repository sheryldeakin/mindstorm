const SafetyResourcePanel = () => (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <h3 className="text-lg font-semibold text-amber-800">If you are in danger</h3>
    <p className="mt-2 text-sm text-amber-700">
      If you are in immediate danger or need urgent help, call your local emergency number. MindStorm is not
      a crisis service.
    </p>
    <div className="mt-3 space-y-2 text-sm text-amber-700">
      <p className="font-semibold text-amber-800">Crisis resources</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          U.S.: Call or text 988 (Suicide &amp; Crisis Lifeline) or chat at{" "}
          <a className="underline" href="https://988lifeline.org/" target="_blank" rel="noreferrer">
            988lifeline.org
          </a>
        </li>
        <li>
          U.K. &amp; ROI: Samaritans 116 123 or{" "}
          <a className="underline" href="https://www.samaritans.org/" target="_blank" rel="noreferrer">
            samaritans.org
          </a>
        </li>
        <li>
          Canada: Talk Suicide 1-833-456-4566 or{" "}
          <a className="underline" href="https://www.crisisservicescanada.ca/" target="_blank" rel="noreferrer">
            crisisservicescanada.ca
          </a>
        </li>
        <li>
          Australia: Lifeline 13 11 14 or{" "}
          <a className="underline" href="https://www.lifeline.org.au/" target="_blank" rel="noreferrer">
            lifeline.org.au
          </a>
        </li>
      </ul>
      <p className="text-xs text-amber-700">
        If you are outside these regions, look up your local crisis line or reach out to someone you trust.
      </p>
    </div>
  </div>
);

export default SafetyResourcePanel;
