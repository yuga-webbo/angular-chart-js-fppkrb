import { Injectable } from '@angular/core';
import { Chart, ChartOptions, PointStyle, TitleOptions } from 'chart.js';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { IChartData, IChartDataColumn, IEmissionsData } from './model';

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private _emissionsDataBS$: BehaviorSubject<IEmissionsData[]> =
    new BehaviorSubject<IEmissionsData[]>([]);

  constructor() {}

  public getForecastEmissions(
    portfolioId: string,
    form: {
      baselineYear: number;
      targetYear: number;
      emissionReductionTarget: number;
      increaseActivity: number;
      emissionOffsetYear: number;
    }
  ): Observable<IChartDataSetConfig> {
    return this._getServerData(portfolioId, form.baselineYear).pipe(
      map((data) =>
        this._getChartData(
          data,
          form.baselineYear,
          form.targetYear,
          form.emissionReductionTarget,
          form.increaseActivity,
          form.emissionOffsetYear
        )
      ),
      map((data) => this._mapData(data.chartData))
    );
  }

  private _getServerData(
    portfolioId: string,
    baselineYear: number
  ): Observable<IEmissionsData[]> {
    // Get emissions from the baseline to current year, for a given portfolio
    if (!this._emissionsDataBS$.getValue().length) {
      // REST Call
      return of([
        {
          year: '2019',
          emissions: 500,
        },
        {
          year: '2020',
          emissions: 230,
        },
      ]).pipe(tap((data) => this._emissionsDataBS$.next(data)));
    }
    return this._emissionsDataBS$.asObservable();
  }

  private _getChartData(
    data: IEmissionsData[],
    baselineYear: number,
    targetYear: number,
    emissionsReductionTarget: number,
    increaseActivity: number,
    emissionOffsetYear: number
  ): IChartData {
    if (!data.length) {
      return {
        totalCarbonOffset: 0,
        costPerYear: 0,
        chartData: [],
      };
    }
    const initialEmissions = data[0].emissions;

    const targetTrayectoryArray: number[] = [];
    const currentYear = new Date().getFullYear();

    data
      .filter((item) => parseInt(item.year) >= baselineYear)
      .forEach((item, index) => {
        const targetTrayectory =
          initialEmissions -
          index *
            ((initialEmissions * emissionsReductionTarget) /
              100 /
              (targetYear - baselineYear));
        targetTrayectoryArray.push(targetTrayectory);
      });

    for (var i = currentYear; i <= targetYear; i++) {
      const targetTrayectory =
        initialEmissions -
        (i - baselineYear) *
          ((initialEmissions * emissionsReductionTarget) /
            100 /
            (targetYear - baselineYear));
      targetTrayectoryArray.push(targetTrayectory);
    }

    // console.log(targetTrayectoryArray);

    const realData: IChartDataColumn[] = data
      .filter((item) => parseInt(item.year) >= baselineYear)
      .map((item, index) => ({
        year: item.year,
        forecastedEmissions: item.emissions,
        forecastedOffset: 0,
        targetTrayectory: targetTrayectoryArray[index],
        forecastedActivity: item.emissions,
      }));

    const forecastedData: IChartDataColumn[] = [];

    let sumOffset: number = 0;

    let index = 0;
    for (let i = currentYear; i <= targetYear; i++) {
      let lastActivityValue = 0;
      let lastOffsetValue = 0;
      let lastEmissionsValue = 0;
      if (i === currentYear) {
        let lastItem = data.find((item) => {
          return parseInt(item.year) === baselineYear;
        });
        if (!lastItem) {
          lastItem = data[0];
        }
        lastActivityValue = lastItem.emissions;
        lastEmissionsValue = lastItem.emissions;
        lastOffsetValue =
          lastActivityValue + (lastActivityValue * emissionOffsetYear) / 100;
      } else {
        lastActivityValue =
          forecastedData[forecastedData.length - 1].forecastedActivity;
        lastOffsetValue =
          forecastedData[forecastedData.length - 1].forecastedOffset;
        lastEmissionsValue =
          forecastedData[forecastedData.length - 1].forecastedEmissions;
      }
      let forecastedActivity =
        lastActivityValue + (lastActivityValue * increaseActivity) / 100;
      let forecastedEmissions =
        lastEmissionsValue - (lastEmissionsValue * emissionOffsetYear) / 100;
      let forecastedOffset = forecastedActivity - forecastedEmissions;

      sumOffset += lastOffsetValue;
      targetTrayectoryArray[i + realData.length];

      forecastedData.push({
        year: i.toString(),
        forecastedEmissions: forecastedEmissions,
        forecastedActivity: forecastedActivity,
        forecastedOffset: forecastedOffset,
        targetTrayectory: targetTrayectoryArray[index + realData.length],
      });
      index++;
    }
    // console.log(forecastedData);
    const chartData = {
      chartData: realData.concat(forecastedData),
      costPerYear: sumOffset * 50,
      totalCarbonOffset: sumOffset,
    };
    // console.log(chartData);
    return chartData;
  }

  private _mapData(data: IChartDataColumn[]): IChartDataSetConfig {
    const labels: string[] = [];
    const forecastedEmissions: number[] = [];
    const forecastedOffset: number[] = [];
    const targetTrayectory: number[] = [];

    data.forEach((item) => {
      labels.push(item.year);
      forecastedEmissions.push(item.forecastedEmissions);
      forecastedOffset.push(item.forecastedOffset);
      targetTrayectory.push(item.targetTrayectory);
    });
    return {
      labels,
      forecastedEmissions,
      forecastedOffset,
      targetTrayectory,
    };
  }

  public getChartOptions(): ChartOptions {
    return {
      plugins: {
        title: {
          align: 'start',
          display: true,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          enabled: true,
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            generateLabels: (chart: Chart) => {
              const data = chart.data;
              if (
                data.labels &&
                data.datasets &&
                data.labels.length &&
                data.datasets.length
              ) {
                const labels = data.datasets.map((dataset, i) => {
                  const backgroundColorsArray =
                    dataset.backgroundColor as string[];
                  return {
                    text: dataset.label || '',
                    fillStyle:
                      backgroundColorsArray[backgroundColorsArray.length - 1] ||
                      'red',
                    strokeStyle:
                      backgroundColorsArray[backgroundColorsArray.length - 1],
                    lineWidth: 1,
                    pointStyle:
                      dataset.type === 'line' ? 'line' : ('rect' as PointStyle),
                    hidden: !chart.getDataVisibility(i),

                    // Extra data used for toggling the correct item
                    datasetIndex: i,
                  };
                });
                return labels;
              }
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            text: 'Year',
            align: 'end',
            display: true,
          } as TitleOptions,
        },
        y: {
          title: {
            text: 'CO2 Emissions (tonnes)',
            align: 'end',
            display: true,
          } as TitleOptions,
        },
      },
      responsive: true,
    };
  }
}
