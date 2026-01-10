import { api } from "./api";

export const ExpenseService = {
  async updateExpense(id: string, data: any) {
    const res = await api.put(`/expenses/${id}`, data);
    return res.data;
  },

  async deleteExpense(id: string) {
    await api.delete(`/expenses/${id}`);
  },
};
