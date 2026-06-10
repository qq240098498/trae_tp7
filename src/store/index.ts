import { create } from 'zustand';
import seedData from '../data/seedData';
import type {
  Customer,
  Project,
  Technician,
  Schedule,
  Appointment,
  AppointmentStatus,
  CardType,
  MembershipCard,
  Transaction,
  ProjectCategory,
} from '@/types';

const STORAGE_KEY = 'physiotherapy-app-store';

export interface AppState {
  initialized: boolean;
  customers: Customer[];
  projectCategories: ProjectCategory[];
  projects: Project[];
  technicians: Technician[];
  schedules: Schedule[];
  appointments: Appointment[];
  cardTypes: CardType[];
  membershipCards: MembershipCard[];
  transactions: Transaction[];
}

export interface AppActions {
  initStore: () => void;
  resetStore: () => void;
  saveToStorage: () => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTechnician: (technician: Omit<Technician, 'id' | 'createdAt'>) => void;
  updateTechnician: (id: string, data: Partial<Technician>) => void;
  addSchedule: (schedule: Omit<Schedule, 'id'>) => void;
  updateSchedule: (id: string, data: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  addCardType: (cardType: Omit<CardType, 'id'>) => void;
  addMembershipCard: (card: Omit<MembershipCard, 'id' | 'createdAt'>) => void;
  useMembershipCard: (id: string, deduct?: { balance?: number; times?: number }) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

const generateId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  initialized: false,
  customers: [],
  projectCategories: [],
  projects: [],
  technicians: [],
  schedules: [],
  appointments: [],
  cardTypes: [],
  membershipCards: [],
  transactions: [],

  saveToStorage: () => {
    const { initialized, ...data } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  initStore: () => {
    const state = get();
    if (state.initialized) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          ...parsed,
          initialized: true,
        });
      } else {
        set({
          customers: [...seedData.customers],
          projectCategories: [...seedData.projectCategories],
          projects: [...seedData.projects],
          technicians: [...seedData.technicians],
          schedules: [...seedData.schedules],
          appointments: [...seedData.appointments],
          cardTypes: [...seedData.cardTypes],
          membershipCards: [...seedData.membershipCards],
          transactions: [...seedData.transactions],
          initialized: true,
        });
        get().saveToStorage();
      }
    } catch (e) {
      console.error('Failed to init store:', e);
      set({
        customers: [...seedData.customers],
        projectCategories: [...seedData.projectCategories],
        projects: [...seedData.projects],
        technicians: [...seedData.technicians],
        schedules: [...seedData.schedules],
        appointments: [...seedData.appointments],
        cardTypes: [...seedData.cardTypes],
        membershipCards: [...seedData.membershipCards],
        transactions: [...seedData.transactions],
        initialized: true,
      });
    }
  },

  resetStore: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      customers: [...seedData.customers],
      projectCategories: [...seedData.projectCategories],
      projects: [...seedData.projects],
      technicians: [...seedData.technicians],
      schedules: [...seedData.schedules],
      appointments: [...seedData.appointments],
      cardTypes: [...seedData.cardTypes],
      membershipCards: [...seedData.membershipCards],
      transactions: [...seedData.transactions],
      initialized: true,
    });
    get().saveToStorage();
  },

  addCustomer: (customer) => {
    const newCustomer: Customer = {
      ...customer,
      id: generateId('c'),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ customers: [...s.customers, newCustomer] }));
    get().saveToStorage();
  },

  updateCustomer: (id, data) => {
    set((s) => ({
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    get().saveToStorage();
  },

  deleteCustomer: (id) => {
    set((s) => ({
      customers: s.customers.filter((c) => c.id !== id),
    }));
    get().saveToStorage();
  },

  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: generateId('p'),
    };
    set((s) => ({ projects: [...s.projects, newProject] }));
    get().saveToStorage();
  },

  updateProject: (id, data) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    get().saveToStorage();
  },

  deleteProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
    }));
    get().saveToStorage();
  },

  addTechnician: (technician) => {
    const newTechnician: Technician = {
      ...technician,
      id: generateId('t'),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ technicians: [...s.technicians, newTechnician] }));
    get().saveToStorage();
  },

  updateTechnician: (id, data) => {
    set((s) => ({
      technicians: s.technicians.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    get().saveToStorage();
  },

  addSchedule: (schedule) => {
    const newSchedule: Schedule = {
      ...schedule,
      id: generateId('s'),
    };
    set((s) => ({ schedules: [...s.schedules, newSchedule] }));
    get().saveToStorage();
  },

  updateSchedule: (id, data) => {
    set((s) => ({
      schedules: s.schedules.map((sc) => (sc.id === id ? { ...sc, ...data } : sc)),
    }));
    get().saveToStorage();
  },

  deleteSchedule: (id) => {
    set((s) => ({
      schedules: s.schedules.filter((sc) => sc.id !== id),
    }));
    get().saveToStorage();
  },

  addAppointment: (appointment) => {
    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateId('a'),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ appointments: [...s.appointments, newAppointment] }));
    if (newAppointment.scheduleId) {
      get().updateSchedule(newAppointment.scheduleId, {
        isAvailable: false,
        appointmentId: newAppointment.id,
      });
    } else {
      get().saveToStorage();
    }
  },

  updateAppointment: (id, data) => {
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a
      ),
    }));
    get().saveToStorage();
  },

  updateAppointmentStatus: (id, status) => {
    const appointment = get().appointments.find((a) => a.id === id);
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
      ),
    }));
    if (
      appointment?.scheduleId &&
      (status === 'cancelled' || status === 'no_show' || status === 'completed')
    ) {
      get().updateSchedule(appointment.scheduleId, {
        isAvailable: status === 'cancelled' || status === 'no_show',
      });
    } else {
      get().saveToStorage();
    }
  },

  addCardType: (cardType) => {
    const newCardType: CardType = {
      ...cardType,
      id: generateId('ct'),
    };
    set((s) => ({ cardTypes: [...s.cardTypes, newCardType] }));
    get().saveToStorage();
  },

  addMembershipCard: (card) => {
    const newCard: MembershipCard = {
      ...card,
      id: generateId('mc'),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ membershipCards: [...s.membershipCards, newCard] }));
    get().saveToStorage();
  },

  useMembershipCard: (id, deduct) => {
    set((s) => ({
      membershipCards: s.membershipCards.map((mc) => {
        if (mc.id !== id) return mc;
        const updated: MembershipCard = { ...mc };
        if (deduct?.balance !== undefined) {
          updated.balance = Math.max(0, (mc.balance ?? 0) - deduct.balance);
        }
        if (deduct?.times !== undefined) {
          updated.remainingTimes = Math.max(0, (mc.remainingTimes ?? 0) - deduct.times);
        }
        return updated;
      }),
    }));
    get().saveToStorage();
  },

  addTransaction: (transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId('tx'),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ transactions: [...s.transactions, newTransaction] }));
    get().saveToStorage();
  },
}));

export default useAppStore;
