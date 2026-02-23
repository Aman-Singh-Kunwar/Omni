function buildBrokerAttributionScope(authUser, brokerCode = "") {
  const scope = [];
  if (authUser?._id) {
    scope.push({ brokerId: authUser._id });
  }

  const normalizedBrokerCode = String(brokerCode || "").trim().toUpperCase();
  if (normalizedBrokerCode) {
    scope.push({ brokerCode: normalizedBrokerCode });
  }

  return scope;
}

export { buildBrokerAttributionScope };
