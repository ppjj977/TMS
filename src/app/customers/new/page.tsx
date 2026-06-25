import { PageHeader } from "@/components/ui";
import { createCustomer } from "@/actions/customers";
import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="New customer" />
      <CustomerForm action={createCustomer} />
    </div>
  );
}
