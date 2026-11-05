import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverDetail } from "@/components/driver/DriverDetail";
import { DRIVER_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { listDriverDeliveries } from "@/lib/delivery/dispatch";

export default async function DriverDeliveryPage({ params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  const user = await requirePageRole(DRIVER_ROLES, `/driver/${deliveryId}`);
  const delivery = (await listDriverDeliveries(user.id)).find((d) => d.orderId === deliveryId);
  if (!delivery) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/driver" className="text-sm text-forest underline">
        All deliveries
      </Link>
      <h1 className="mt-2 text-3xl">{delivery.reference}</h1>
      <DriverDetail delivery={delivery} />
    </div>
  );
}
