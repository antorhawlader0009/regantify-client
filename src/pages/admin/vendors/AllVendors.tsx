import { VendorListPage } from './VendorListPage';

/** Super Admin > All Vendors (super-admin-plan.md Step 5): the shared list with every status. */
export default function AllVendors() {
  return <VendorListPage title="All Vendors" chips={[null, 'ACTIVE', 'PENDING', 'SUSPENDED', 'CLOSED']} />;
}
