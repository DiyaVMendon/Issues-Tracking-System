import { axiosRequest } from "./axiosRequest";

const pendingRequests = new Map();

export const deduplicatedRequest = (url, options = {}) => {
  const pendingRequest = pendingRequests.get(url);
  if (pendingRequest) return pendingRequest;

  const request = axiosRequest(url, null, "GET", {}, options).finally(() => {
    if (pendingRequests.get(url) === request) {
      pendingRequests.delete(url);
    }
  });
  pendingRequests.set(url, request);
  return request;
};

export const mergeItemsById = (existingItems, nextItems, getId) => {
  const itemsById = new Map();
  [...existingItems, ...nextItems].forEach((item) => {
    itemsById.set(String(getId(item)), item);
  });
  return Array.from(itemsById.values());
};
