import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";

function CustomerFavoritesPage({ favoriteProviders, renderStars, onToggleFavorite, onBookProvider }) {
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
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-base font-semibold text-gray-700 shrink-0">
                  {provider.image}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{provider.name}</h4>
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
            <div className="flex mt-4">
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
