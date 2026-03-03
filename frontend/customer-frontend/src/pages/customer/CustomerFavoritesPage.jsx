import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";

function toAvatarUrl(name) {
  const encodedName = encodeURIComponent(String(name || "Worker"));
  return `https://ui-avatars.com/api/?name=${encodedName}&background=e5e7eb&color=374151&size=160`;
}

function CustomerFavoritesPage({ favoriteProviders, renderStars, onToggleFavorite, onBookProvider, onViewWorkerProfile }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-gray-900">Favorite Providers</h3>
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {favoriteProviders.map((provider) => (
          <div key={provider.id} className="border p-6 rounded-lg bg-white/60">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <img
                  src={provider.photoUrl || toAvatarUrl(provider.name)}
                  alt={provider.name}
                  className="h-16 w-16 shrink-0 rounded-full border border-gray-200 bg-gray-100 object-cover"
                />
                <div>
                  <button
                    type="button"
                    onClick={() => onViewWorkerProfile?.(provider)}
                    className="text-left font-semibold text-gray-900 hover:text-blue-700"
                  >
                    {provider.name}
                  </button>
                  <p className="text-sm text-gray-600">
                    {Array.isArray(provider.servicesProvided) && provider.servicesProvided.length
                      ? provider.servicesProvided.join(", ")
                      : provider.service}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    {renderStars(provider.rating)}
                    <span className="text-sm text-gray-600">({provider.reviews})</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(provider.id)}
                aria-label={`Remove ${provider.name} from favorites`}
                className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 shrink-0"
              >
                <Heart className="w-5 h-5 text-red-500 fill-current" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onViewWorkerProfile?.(provider)}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                View Job Profile
              </button>
              <button
                type="button"
                onClick={() => onBookProvider(provider)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
        {favoriteProviders.length === 0 && <p className="text-sm text-gray-500">No favorite workers yet.</p>}
      </div>
    </div>
  );
}

export default CustomerFavoritesPage;
