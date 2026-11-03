import * as ControlActionTypes from "actions/controlActionTypes";

const initState = {
    accessToken: null,
};

const controlReducer = (state = initState, action) => {
    switch (action.type) {
       
        case ControlActionTypes.SET_ACCESSTOKEN:
            return {
                ...state,
                accessToken: action.payload,
            };
       
        default:
            return state;
    }
};

export default controlReducer;