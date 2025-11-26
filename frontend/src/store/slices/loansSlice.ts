import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loansAPI } from '@/services/api';

interface Loan {
  id: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string;
  };
}

interface LoansState {
  loans: Loan[];
  loading: boolean;
  error: string | null;
}

const initialState: LoansState = {
  loans: [],
  loading: false,
  error: null,
};

export const fetchMyLoans = createAsyncThunk(
  'loans/fetchMyLoans',
  async (status?: string) => {
    const response = await loansAPI.getMy(status);
    return response.data;
  }
);

export const borrowBook = createAsyncThunk(
  'loans/borrowBook',
  async (bookId: string) => {
    const response = await loansAPI.borrow(bookId);
    return response.data;
  }
);

export const returnBook = createAsyncThunk(
  'loans/returnBook',
  async (loanId: string) => {
    const response = await loansAPI.return(loanId);
    return response.data;
  }
);

const loansSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyLoans.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyLoans.fulfilled, (state, action) => {
        state.loading = false;
        state.loans = action.payload;
      })
      .addCase(fetchMyLoans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch loans';
      });
  },
});

export default loansSlice.reducer;