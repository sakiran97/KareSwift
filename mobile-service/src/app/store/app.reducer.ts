// Minimal NgRx reducer stub
import { Action, createReducer, on } from '@ngrx/store';

export interface AppState {}
export const initialState: AppState = {};

const _reducer = createReducer(initialState);
export function appReducer(state: AppState | undefined, action: Action) {
  return _reducer(state, action);
}
