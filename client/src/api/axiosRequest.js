import axios from "axios";
import store from "../store/store";
import {
  API_REQUEST_FINISHED,
  API_REQUEST_STARTED,
} from "../actions/controlActionTypes";

export const base_url = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const axiosRequest = (
  url,
  data = null,
  method = "GET",
  header = {},
  options = {}
) => {
  const accessToken = store.getState().control.accessToken;
  store.dispatch({ type: API_REQUEST_STARTED });

  return axios({
    url: `${base_url}${url}`,
    method,
    data,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...header,
    },
    ...options,
  })
    .then((response) => response.data)
    .catch((error) => {
      console.error(
        "API Error:",
        error.response?.data?.message || error.message
      );
      throw error;
    })
    .finally(() => {
      store.dispatch({ type: API_REQUEST_FINISHED });
    });
};
