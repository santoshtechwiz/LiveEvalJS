/**
 * Shared evaluation result model
 */
export type EvalResult = {
  line?: number;
  value?: any;
  isError?: boolean;
  error?: any;
  producedFromStatement?: boolean;
};

export default EvalResult;
