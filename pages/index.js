// Redirect to Home landing page
export default function Index() {
  if (typeof window !== 'undefined') {
    window.location.href = '/Home';
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to MessageHub...</p>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/Home',
      permanent: false,
    },
  };
}

