import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/layout/PageHeader";

const SettingsBillingPage = () => {
  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-billing" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Current plan</h3>
          <p className="mt-1 text-sm text-slate-500">Personal · Monthly</p>
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Billing is coming soon. These details are read-only for now.
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">$12 / month</p>
              <p className="text-xs text-slate-500">Renews Feb 28, 2025</p>
            </div>
            <Button variant="secondary" size="sm" disabled>Manage plan</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Payment method</h3>
          <p className="mt-1 text-sm text-slate-500">Visa ending in 2231</p>
          <div className="mt-4 flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Card on file</p>
              <p className="text-xs text-slate-500">Expires 08/26</p>
            </div>
            <Button variant="secondary" size="sm" disabled>Update</Button>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">Invoices</h3>
          <div className="mt-4 space-y-2">
            {[
              { id: "inv-1", date: "Jan 28, 2025", amount: "$12.00" },
              { id: "inv-2", date: "Dec 28, 2024", amount: "$12.00" },
            ].map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm">
                <span className="text-slate-600">{invoice.date}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-700">{invoice.amount}</span>
                  <Button variant="ghost" size="sm" disabled>Download</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsBillingPage;
