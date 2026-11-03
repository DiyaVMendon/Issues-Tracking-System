
import axios from "axios";
import store from "../store/store";

export const base_url = import.meta.env.VITE_API_URL;

export const axiosRequest = (
  url,
  data = null,
  method = "GET",
  header = {},
  options = {}
) => {
  // Get latest accessToken from Redux
  const accessToken = store.getState().control.accessToken;

  return axios({
    url: `${base_url}${url}`,
    method,
    data,
    headers: {
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...header,
    },
    ...options,
  })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error(
        "API Error:",
        error.response?.data?.message || error.message
      );

      throw error;
    });
};
