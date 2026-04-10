/**
 * 数据管理工具模块
 * 用于在车队管理和司机管理页面之间共享数据
 */

import { type ProviderSession } from '@/types/provider';

// 司机数据类型
export interface Driver {
  id: number;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  trips?: number;
  plate?: string;
}

// 车辆数据类型
export interface Vehicle {
  id: number;
  plate: string;
  model: string;
  seats: number;
  year: string;
  color: string;
  insuranceDate: string;
  status: 'active' | 'maintenance';
  driver: DriverInfo | null;
}

export interface DriverInfo {
  id: number;
  name: string;
  phone: string;
}

// 本地存储键名
const STORAGE_KEYS = {
  DRIVERS: 'luxeway_drivers',
  VEHICLES: 'luxeway_vehicles',
  PROVIDER_SESSION: 'luxeway_provider_session'
};

const DEFAULT_PROVIDER_SESSION: ProviderSession = {
  reviewStatus: 'APPROVED',
  role: 'OWNER',
  companyName: '悦程商务接待',
  displayName: '运营负责人'
};

// 默认司机数据
const DEFAULT_DRIVERS: Driver[] = [
  {
    id: 1,
    name: '张伟',
    phone: '138****1234',
    role: '队长',
    active: true,
    trips: 45,
    plate: '鄂A·B1234'
  },
  {
    id: 2,
    name: '李强',
    phone: '139****5678',
    role: '司机',
    active: true,
    trips: 23,
    plate: '鄂A·X5678'
  },
  {
    id: 3,
    name: '王芳',
    phone: '150****9012',
    role: '司机',
    active: false,
    trips: 18,
    plate: '鄂A·C9012'
  }
];

// 默认车辆数据
const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 1,
    plate: '鄂A·B1234',
    model: '丰田阿尔法',
    seats: 7,
    year: '2022',
    color: '黑色',
    insuranceDate: '2025-06-15',
    status: 'active',
    driver: { id: 1, name: '张伟', phone: '138****1234' }
  },
  {
    id: 2,
    plate: '鄂A·X5678',
    model: '奔驰S级',
    seats: 4,
    year: '2023',
    color: '白色',
    insuranceDate: '2025-12-20',
    status: 'active',
    driver: { id: 2, name: '李强', phone: '139****5678' }
  },
  {
    id: 3,
    plate: '鄂A·C9012',
    model: '别克GL8',
    seats: 8,
    year: '2021',
    color: '银色',
    insuranceDate: '2024-10-01',
    status: 'maintenance',
    driver: null
  }
];

/**
 * 司机数据管理类
 */
export class DriverManager {
  /**
   * 获取所有司机
   */
  static getDrivers(): Driver[] {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.DRIVERS);
      return data && data.length > 0 ? data : DEFAULT_DRIVERS;
    } catch (e) {
      console.error('获取司机数据失败:', e);
      return DEFAULT_DRIVERS;
    }
  }

  /**
   * 保存司机列表
   */
  static saveDrivers(drivers: Driver[]): boolean {
    try {
      uni.setStorageSync(STORAGE_KEYS.DRIVERS, drivers);
      return true;
    } catch (e) {
      console.error('保存司机数据失败:', e);
      return false;
    }
  }

  /**
   * 添加司机
   */
  static addDriver(driver: Omit<Driver, 'id'>): Driver | null {
    try {
      const drivers = this.getDrivers();
      const newDriver: Driver = {
        ...driver,
        id: Date.now()
      };
      drivers.push(newDriver);
      this.saveDrivers(drivers);
      return newDriver;
    } catch (e) {
      console.error('添加司机失败:', e);
      return null;
    }
  }

  /**
   * 更新司机
   */
  static updateDriver(id: number, updates: Partial<Driver>): boolean {
    try {
      const drivers = this.getDrivers();
      const index = drivers.findIndex(d => d.id === id);
      if (index !== -1) {
        drivers[index] = { ...drivers[index], ...updates };
        this.saveDrivers(drivers);
        return true;
      }
      return false;
    } catch (e) {
      console.error('更新司机失败:', e);
      return false;
    }
  }

  /**
   * 删除司机
   */
  static deleteDriver(id: number): boolean {
    try {
      const drivers = this.getDrivers();
      const index = drivers.findIndex(d => d.id === id);
      if (index !== -1) {
        drivers.splice(index, 1);
        this.saveDrivers(drivers);
        return true;
      }
      return false;
    } catch (e) {
      console.error('删除司机失败:', e);
      return false;
    }
  }

  /**
   * 根据ID获取司机
   */
  static getDriverById(id: number): Driver | null {
    const drivers = this.getDrivers();
    return drivers.find(d => d.id === id) || null;
  }

  /**
   * 获取激活的司机列表（用于车辆关联）
   */
  static getActiveDrivers(): Driver[] {
    return this.getDrivers().filter(d => d.active);
  }
}

/**
 * 车辆数据管理类
 */
export class VehicleManager {
  /**
   * 获取所有车辆
   */
  static getVehicles(): Vehicle[] {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.VEHICLES);
      return data && data.length > 0 ? data : DEFAULT_VEHICLES;
    } catch (e) {
      console.error('获取车辆数据失败:', e);
      return DEFAULT_VEHICLES;
    }
  }

  /**
   * 保存车辆列表
   */
  static saveVehicles(vehicles: Vehicle[]): boolean {
    try {
      uni.setStorageSync(STORAGE_KEYS.VEHICLES, vehicles);
      return true;
    } catch (e) {
      console.error('保存车辆数据失败:', e);
      return false;
    }
  }

  /**
   * 添加车辆
   */
  static addVehicle(vehicle: Omit<Vehicle, 'id'>): Vehicle | null {
    try {
      const vehicles = this.getVehicles();
      const newVehicle: Vehicle = {
        ...vehicle,
        id: Date.now()
      };
      vehicles.unshift(newVehicle);
      this.saveVehicles(vehicles);
      return newVehicle;
    } catch (e) {
      console.error('添加车辆失败:', e);
      return null;
    }
  }

  /**
   * 更新车辆
   */
  static updateVehicle(id: number, updates: Partial<Vehicle>): boolean {
    try {
      const vehicles = this.getVehicles();
      const index = vehicles.findIndex(v => v.id === id);
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...updates };
        this.saveVehicles(vehicles);
        return true;
      }
      return false;
    } catch (e) {
      console.error('更新车辆失败:', e);
      return false;
    }
  }

  /**
   * 删除车辆
   */
  static deleteVehicle(id: number): boolean {
    try {
      const vehicles = this.getVehicles();
      const index = vehicles.findIndex(v => v.id === id);
      if (index !== -1) {
        vehicles.splice(index, 1);
        this.saveVehicles(vehicles);
        return true;
      }
      return false;
    } catch (e) {
      console.error('删除车辆失败:', e);
      return false;
    }
  }

  /**
   * 根据ID获取车辆
   */
  static getVehicleById(id: number): Vehicle | null {
    const vehicles = this.getVehicles();
    return vehicles.find(v => v.id === id) || null;
  }

  /**
   * 获取运营中的车辆数量
   */
  static getActiveVehicleCount(): number {
    return this.getVehicles().filter(v => v.status === 'active').length;
  }

  /**
   * 检查保险是否即将到期（30天内）
   */
  static isInsuranceExpiring(dateStr: string): boolean {
    if (!dateStr || dateStr === '未设置') return false;
    const insuranceDate = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  }

  /**
   * 获取即将到期的保险车辆
   */
  static getExpiringInsuranceVehicles(): Vehicle[] {
    return this.getVehicles().filter(v => this.isInsuranceExpiring(v.insuranceDate));
  }
}

export class ProviderSessionManager {
  static getSession(): ProviderSession {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.PROVIDER_SESSION);
      return data && data.role && data.reviewStatus ? data : DEFAULT_PROVIDER_SESSION;
    } catch (e) {
      console.error('获取商家会话失败:', e);
      return DEFAULT_PROVIDER_SESSION;
    }
  }

  static saveSession(session: ProviderSession): boolean {
    try {
      uni.setStorageSync(STORAGE_KEYS.PROVIDER_SESSION, session);
      return true;
    } catch (e) {
      console.error('保存商家会话失败:', e);
      return false;
    }
  }

  static updateSession(updates: Partial<ProviderSession>): boolean {
    return this.saveSession({ ...this.getSession(), ...updates });
  }

  static resetSession(): boolean {
    return this.saveSession(DEFAULT_PROVIDER_SESSION);
  }
}

/**
 * 格式化车牌号（添加中间点）
 */
export function formatPlateNumber(plate: string): string {
  // 移除可能存在的非字母数字字符
  const cleanPlate = plate.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

  // 如果是7位标准车牌（2位省份+5位字母数字）
  if (cleanPlate.length === 7) {
    return cleanPlate.slice(0, 2) + '·' + cleanPlate.slice(2);
  }

  // 如果已经包含点号，返回原样
  if (plate.includes('·')) {
    return plate;
  }

  return cleanPlate;
}

/**
 * 获取车辆颜色对应的背景色
 */
export function getVehicleColorBg(colorName: string): string {
  const colorMap: Record<string, string> = {
    '黑色': '#2c2c2c',
    '白色': '#f5f5f5',
    '银色': '#c0c0c0',
    '灰色': '#808080',
    '红色': '#e74c3c',
    '蓝色': '#3498db',
    '棕色': '#8b4513',
    '香槟色': '#f7e7ce',
    '黄色': '#f1c40f'
  };
  return colorMap[colorName] || '#ddd';
}
