import * as ControlActionTypes from "../actions/controlActionTypes";

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

const initState = {
  accessToken: getStoredAccessToken(),
  loggedInUser: null,
  pendingRequests: 0,
};

const controlReducer = (state = initState, action) => {
  switch (action.type) {
    case ControlActionTypes.SET_ACCESSTOKEN:
      return {
        ...state,
        accessToken: action.payload,
      };

    case ControlActionTypes.AUTHENTICATED:
      return {
        ...state,
        loggedInUser: {
          ...state.loggedInUser,
          ...action.payload,
        },
      };

    case ControlActionTypes.NOT_AUTHENTICATED:
      return {
        ...state,
        accessToken: null,
        loggedInUser: null,
      };

    case ControlActionTypes.API_REQUEST_STARTED:
      return {
        ...state,
        pendingRequests: state.pendingRequests + 1,
      };

    case ControlActionTypes.API_REQUEST_FINISHED:
      return {
        ...state,
        pendingRequests: Math.max(0, state.pendingRequests - 1),
      };

    default:
      return state;
  }
};

export default controlReducer;