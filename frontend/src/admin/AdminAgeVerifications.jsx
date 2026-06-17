import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminAgeVerifications({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/age-verifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Fout bij ophalen leeftijdsverificaties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Live polling for new requests every 5 seconds
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (id, status) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/age-verifications/${id}/resolve`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.error || 'Fout bij afhandelen verzoek.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const resolvedRequests = requests.filter(r => r.status !== 'PENDING');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-surface border border-border px-6 py-5 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-primary">18+ Verificatie Aanvragen</h2>
        <p className="text-sm text-muted mt-1">
          Gasten die alcohol of 18+ producten willen bestellen, komen hier binnen. Controleer fysiek hun ID-kaart en keur ze goed of wijs ze af.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4">Openstaande Verzoeken ({pendingRequests.length})</h3>
        {pendingRequests.length === 0 ? (
          <div className="bg-surface border border-border border-dashed p-8 rounded-2xl text-center text-muted">
            Geen openstaande verzoeken op dit moment.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-surface border border-warning-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-semibold text-warning uppercase tracking-wider">Nieuw Verzoek</span>
                    <h4 className="font-bold text-lg text-primary mt-1">{req.username}</h4>
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => handleResolve(req.id, 'APPROVED')}
                    className="flex-1 bg-success-bg hover:bg-success text-success hover:text-white border border-success-border font-medium py-2 rounded-xl transition-colors"
                  >
                    18+ Goedkeuren
                  </button>
                  <button
                    onClick={() => handleResolve(req.id, 'REJECTED')}
                    className="flex-1 bg-danger-bg hover:bg-danger text-danger hover:text-white border border-danger-border font-medium py-2 rounded-xl transition-colors"
                  >
                    Afwijzen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolvedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4 text-muted">Afgehandelde Verzoeken</h3>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Gast</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Tijdstip</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {resolvedRequests.map(req => (
                  <tr key={req.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {req.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                      {new Date(req.resolved_at || req.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {req.status === 'APPROVED' ? (
                        <span className="text-success bg-success-bg px-2.5 py-1 rounded-full text-xs">Goedgekeurd</span>
                      ) : (
                        <span className="text-danger bg-danger-bg px-2.5 py-1 rounded-full text-xs">Afgewezen</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAgeVerifications;
