import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-regantify-content flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <ShieldAlert className="mx-auto text-regantify-text mb-4" size={48} strokeWidth={1.5} />
        <h1 className="text-xl font-semibold text-regantify-text mb-2">
          You don't have access to this page
        </h1>
        <p className="text-regantify-text-muted text-sm mb-6">
          Your account role doesn't allow this section. If you think this is a mistake, contact
          support.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-regantify-black text-white font-medium px-6 py-2.5 rounded-xl hover:bg-black"
        >
          Go back home
        </button>
      </div>
    </div>
  );
}
