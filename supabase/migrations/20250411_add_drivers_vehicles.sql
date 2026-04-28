-- 创建 drivers 表：司机与企业车队的关系
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- 关联的用户ID，司机绑定后填充
  phone VARCHAR(11) NOT NULL, -- 司机手机号，用于匹配绑定
  name VARCHAR(50), -- 司机姓名
  role VARCHAR(20) NOT NULL DEFAULT 'driver', -- 角色: owner/admin/dispatcher/driver
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 状态: pending/active/unbound
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 vehicles 表：车辆信息
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  plate_number VARCHAR(20) NOT NULL, -- 车牌号
  model VARCHAR(100) NOT NULL, -- 车型
  seats INTEGER NOT NULL DEFAULT 7, -- 座位数
  color VARCHAR(20), -- 车辆颜色
  front_image_url TEXT, -- 车头照片
  side_image_url TEXT, -- 侧面照片
  interior_image_url TEXT, -- 内饰照片
  driver_license_url TEXT, -- 驾驶证照片（个人司机）
  driver_license_no VARCHAR(50), -- 驾驶证号
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 状态: active/inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为 drivers 表创建索引
CREATE INDEX IF NOT EXISTS idx_drivers_merchant_id ON drivers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);

-- 为 vehicles 表创建索引
CREATE INDEX IF NOT EXISTS idx_vehicles_merchant_id ON vehicles(merchant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);

-- 创建唯一约束：同一企业下手机号唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_merchant_phone ON drivers(merchant_id, phone);

-- 创建唯一约束：同一企业下车牌号唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_merchant_plate ON vehicles(merchant_id, plate_number);

-- 添加 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为 profiles 表添加 merchant_id 字段（如果不存在）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id);

-- 为 profiles 表添加 role 字段（如果不存在）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'passenger';

-- 为 profiles 表添加 phone 字段（如果不存在）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(11);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_merchant_id ON profiles(merchant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Storage bucket: merchant-images 用于商家上传证件和车辆照片
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-images', 'merchant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: 允许商家上传图片
CREATE POLICY "商家可上传图片" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'merchant-images');

-- Storage policy: 允许公开访问
CREATE POLICY "公开访问商家图片" ON storage.objects
  FOR SELECT USING (bucket_id = 'merchant-images');