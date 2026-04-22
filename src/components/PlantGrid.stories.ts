import type {Meta, StoryObj} from '@storybook/vue3-vite'

import type {MeasurementStatus} from '../types/plant'

import {createPlant} from '../types/plant'
import PlantGrid from './PlantGrid.vue'

const meta: Meta<typeof PlantGrid> = {
    component: PlantGrid,
}

export default meta
type Story = StoryObj<typeof PlantGrid>

const makePlant = (id: number, moisture_status: MeasurementStatus, nickname: string) =>
  createPlant({ id, nickname, scientific_name: 'Monstera deliciosa', moisture_status, light_status: 'perfect', temperature_status: 'perfect', salinity_status: 'perfect', thumb_path: '' })

const FEW = [
    makePlant(1, 'too_low', 'Fikus'),
    makePlant(2, 'low',     'Monstera'),
    makePlant(3, 'perfect', 'Efeutute'),
]

const MANY = [
    makePlant(1,  'too_low', 'Fikus'),
    makePlant(2,  'low',     'Monstera'),
    makePlant(3,  'perfect', 'Efeutute'),
    makePlant(4,  'perfect', 'Bogenhanf'),
    makePlant(5,  'high',    'Aloe Vera'),
    makePlant(6,  'perfect', 'Geldbaum'),
    makePlant(7,  'low',     'Orchidee'),
    makePlant(8,  'perfect', 'Palme'),
    makePlant(9,  'too_low', 'Kaktus'),
    makePlant(10, 'perfect', 'Farn'),
    makePlant(11, 'perfect', 'Tillandsie'),
    makePlant(12, 'too_high','Basilikum'),
    makePlant(13, 'perfect', 'Zitronenbaum'),
    makePlant(14, 'low',     'Bambus'),
    makePlant(15, 'perfect', 'Yucca'),
    makePlant(16, 'too_low', 'Sukkulente'),
    makePlant(17, 'perfect', 'Drachenbaum'),
    makePlant(18, 'high',    'Bromelien'),
    makePlant(19, 'perfect', 'Chrysantheme'),
    makePlant(20, 'low',     'Rosmarin'),
    makePlant(21, 'perfect', 'Minze'),
    makePlant(22, 'too_low', 'Basilikum 2'),
    makePlant(23, 'perfect', 'Lavendel'),
]

export const Empty: Story = {args: {plants: []}}
export const ThreePlants: Story = {args: {plants: FEW}}
export const TwentyThreePlants: Story = {args: {plants: MANY}}
