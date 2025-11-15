import { CalorieTransaction } from "./CalorieTransaction";

@component
export class CalorieManager extends BaseScriptComponent {
  @input
  private _currentCalorieCount: number = 0;

  @input
  private _calorieGoal: number = 2000;

  // Array to store all calorie transactions
  private _transactions: CalorieTransaction[] = [];

  // Array to store callback functions for transaction events
  private transactionListeners: ((
    manager: CalorieManager,
    transaction: CalorieTransaction
  ) => void)[] = [];

  /**
   * Get the current calorie count
   */
  get currentCalorieCount(): number {
    return this._currentCalorieCount;
  }

  /**
   * Set the current calorie count
   */
  set currentCalorieCount(value: number) {
    this._currentCalorieCount = value;
  }

  /**
   * Get the calorie goal
   */
  get calorieGoal(): number {
    return this._calorieGoal;
  }

  /**
   * Set the calorie goal
   */
  set calorieGoal(value: number) {
    this._calorieGoal = value;
  }

  /**
   * Get all transactions
   */
  get transactions(): CalorieTransaction[] {
    return [...this._transactions];
  }

  /**
   * Submit a calorie transaction
   * @param transaction - The transaction to submit
   */
  submitTransaction(transaction: CalorieTransaction): void {
    // Auto-fill timestamp if not provided
    const completeTransaction: CalorieTransaction = {
      ...transaction,
      timestamp: transaction.timestamp || new Date().toISOString(),
    };

    // Add transaction to history
    this._transactions.push(completeTransaction);

    // Update calorie count
    this.currentCalorieCount += completeTransaction.amount;

    // Notify transaction listeners
    this.notifyTransaction(completeTransaction);
  }

  /**
   * Add a listener for calorie transactions
   * @param callback - Function to call when a transaction is submitted
   */
  addTransactionListener(
    callback: (manager: CalorieManager, transaction: CalorieTransaction) => void
  ): void {
    this.transactionListeners.push(callback);
  }

  /**
   * Remove a listener for calorie transactions
   * @param callback - The callback function to remove
   */
  removeTransactionListener(
    callback: (manager: CalorieManager, transaction: CalorieTransaction) => void
  ): void {
    const index = this.transactionListeners.indexOf(callback);
    if (index > -1) {
      this.transactionListeners.splice(index, 1);
    }
  }

  /**
   * Notify all subscribers of a transaction
   * @param transaction - The transaction that was submitted
   */
  private notifyTransaction(transaction: CalorieTransaction): void {
    for (const listener of this.transactionListeners) {
      listener(this, transaction);
    }
  }
}
