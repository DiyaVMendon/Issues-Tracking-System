import { createStore, combineReducers } from "redux";
import controlReducer from "../reducers/controlReducer";

const rootReducer = combineReducers({
  control: controlReducer,
});

const store = createStore(rootReducer);

export default store;
