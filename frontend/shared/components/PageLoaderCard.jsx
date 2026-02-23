import React from "react";

function PageLoaderCard({ label = "Loading section..." }) {
  return <div className="rounded-xl border bg-white/70 p-6 text-sm font-medium text-gray-600">{label}</div>;
}

export default PageLoaderCard;
