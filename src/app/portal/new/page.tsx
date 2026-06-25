import { PageHeader } from "@/components/ui";
import { PortalBookingForm } from "./booking-form";

export default function PortalNewBookingPage() {
  return (
    <div>
      <PageHeader
        title="New booking"
        subtitle="We'll confirm by email and price it against your account rates"
      />
      <PortalBookingForm />
    </div>
  );
}
