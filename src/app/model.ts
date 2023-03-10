export interface IChartDataColumn {
  year: string;
  forecastedActivity: number;
  forecastedEmissions: number;
  forecastedOffset: number;
  targetTrayectory: number;
}

export interface IChartData {
  totalCarbonOffset: number;
  costPerYear: number;
  chartData: IChartDataColumn[];
}

export interface IEmissionsData {
  year: string;
  emissions: number;
}

export interface IChartDataSetConfig {
  labels: string[];
  forecastedEmissions: number[];
  forecastedOffset: number[];
  targetTrayectory: number[];
}
