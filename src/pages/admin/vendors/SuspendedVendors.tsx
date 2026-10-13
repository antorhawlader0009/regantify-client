import { VendorListPage } from './VendorListPage';

/** Super Admin > Suspended Vendors: the shared list, starting on the suspended ones (closed stores are one chip away). */
export default function SuspendedVendors() {
  return <VendorListPage title="Suspended stores" chips={['SUSPENDED', 'CLOSED']} />;
}
