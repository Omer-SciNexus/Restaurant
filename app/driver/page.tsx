import { DriverList } from "@/components/driver/DriverList";
import { DRIVER_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { listDriverDeliveries } from "@/lib/delivery/dispatch";

export default async function DriverPage() {
  const user = await requirePageRole(DRIVER_ROLES, "/driver");
  const deliveries = await listDriverDeliveries(user.id);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl">My deliveries</h1>
      <DriverList driverId={user.id} initial={deliveries} />
    </div>
  );
}
