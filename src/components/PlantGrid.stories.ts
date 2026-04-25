import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { makeMoisturePlant } from '../stories/plantFactory'
import PlantGrid from './PlantGrid.vue'

const meta: Meta<typeof PlantGrid> = {
  component: PlantGrid,
}

export default meta
type Story = StoryObj<typeof PlantGrid>

const FEW = [
  makeMoisturePlant(1, 'too_low', 'Fikus'),
  makeMoisturePlant(2, 'low',     'Monstera'),
  makeMoisturePlant(3, 'perfect', 'Efeutute'),
]

const MANY = [
  makeMoisturePlant(1,  'too_low', 'Fikus'),
  makeMoisturePlant(2,  'low',     'Monstera'),
  makeMoisturePlant(3,  'perfect', 'Efeutute'),
  makeMoisturePlant(4,  'perfect', 'Bogenhanf'),
  makeMoisturePlant(5,  'high',    'Aloe Vera'),
  makeMoisturePlant(6,  'perfect', 'Geldbaum'),
  makeMoisturePlant(7,  'low',     'Orchidee'),
  makeMoisturePlant(8,  'perfect', 'Palme'),
  makeMoisturePlant(9,  'too_low', 'Kaktus'),
  makeMoisturePlant(10, 'perfect', 'Farn'),
  makeMoisturePlant(11, 'perfect', 'Tillandsie'),
  makeMoisturePlant(12, 'too_high','Basilikum'),
  makeMoisturePlant(13, 'perfect', 'Zitronenbaum'),
  makeMoisturePlant(14, 'low',     'Bambus'),
  makeMoisturePlant(15, 'perfect', 'Yucca'),
  makeMoisturePlant(16, 'too_low', 'Sukkulente'),
  makeMoisturePlant(17, 'perfect', 'Drachenbaum'),
  makeMoisturePlant(18, 'high',    'Bromelien'),
  makeMoisturePlant(19, 'perfect', 'Chrysantheme'),
  makeMoisturePlant(20, 'low',     'Rosmarin'),
  makeMoisturePlant(21, 'perfect', 'Minze'),
  makeMoisturePlant(22, 'too_low', 'Basilikum 2'),
  makeMoisturePlant(23, 'perfect', 'Lavendel'),
]

export const Empty: Story = { args: { plants: [] } }
export const ThreePlants: Story = { args: { plants: FEW } }
export const TwentyThreePlants: Story = { args: { plants: MANY } }
