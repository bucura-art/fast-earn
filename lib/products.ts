export const VIP_PRODUCTS = [
  {
    code: 'vip1',
    name: 'VIP 1',
    image: '/images/products/vip1.png',
    price: 6_000,
    dailyIncome: 900,
    durationDays: 27000,
  },
  {
    code: 'vip2',
    name: 'VIP 2',
    image: '/images/products/vip2.png',
    price: 12_000,
    dailyIncome: 2000,
    durationDays: 45,
  },
  {
    code: 'vip3',
    name: 'VIP 3',
    image: '/images/products/vip3.png',
    price: 30_000,
    dailyIncome: 6500,
    durationDays: 60,
  },
  {
    code: 'vip4',
    name: 'VIP 4',
    image: '/images/products/vip4.png',
    price: 50_000,
    dailyIncome: 14_000,
    durationDays: 90,
  },
  {
    code: 'vip5',
    name: 'VIP 5',
    image: '/images/products/vip5.png',
    price: 100_000,
    dailyIncome: 28_000,
    durationDays: 120,
  },
  {
    code: 'vip6',
    name: 'VIP 6',
    image: '/images/products/vip6.png',
    price: 200_000,
    dailyIncome: 650_000,
    durationDays: 180,
  },
] as const

export type VipProduct = (typeof VIP_PRODUCTS)[number]

export function getVipProduct(code: string): VipProduct | undefined {
  return VIP_PRODUCTS.find((product) => product.code === code)
}
