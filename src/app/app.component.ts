import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartData,
  ChartOptions,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
} from 'chart.js';
import { Observable } from 'rxjs';
import { debounceTime, take, tap } from 'rxjs/operators';
import { ChartDataService } from './chart-data.service';

function registerChartComponents() {
  Chart.register(CategoryScale);
  Chart.register(LinearScale);
  Chart.register(BarController);
  Chart.register(BarElement);
  Chart.register(LineController);
  Chart.register(LineElement);
  Chart.register(PointElement);
}

registerChartComponents();

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  canvas: any;
  ctx: any;
  @ViewChild('mychart')
  pathwayChart!: { nativeElement: any };

  stackedData!: ChartData;
  stackedOptions!: ChartOptions;

  form!: FormGroup;

  data!: Observable<any>;
  chart!: Chart;

  public currentYear = new Date().getFullYear();

  constructor(
    private _chartDataService: ChartDataService,
    private _formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.form = this._formBuilder.group({
      baselineYear: [2019, Validators.required],
      targetYear: [
        2030,
        [Validators.required, Validators.min(2022), Validators.min(2050)],
      ],
      emissionReductionTarget: [
        50,
        [Validators.required, Validators.min(0), Validators.min(100)],
      ],
      increaseActivity: [
        5,
        [Validators.required, Validators.min(0), Validators.min(100)],
      ],
      emissionOffsetYear: [
        15,
        [Validators.required, Validators.min(0), Validators.min(100)],
      ],
    });

    this.form.valueChanges.pipe(debounceTime(1000)).subscribe((change) => {
      this._updateChart();
    });

    this.data = this._chartDataService
      .getForecastEmissions('test_portfolio_id', this.form.getRawValue())
      .pipe(tap((res) => this._fillChartData(res)));

    this.stackedOptions = this._chartDataService.getChartOptions();
  }

  ngAfterViewInit() {
    this.canvas = this.pathwayChart.nativeElement;
    this.ctx = this.canvas.getContext('2d');

    this.chart = new Chart(this.ctx, {
      type: 'bar',

      data: this.stackedData,
      options: this.stackedOptions,
    });
  }

  private _fillChartData(data: {
    labels: string[];
    forecastedEmissions: number[];
    forecastedOffset: number[];
    targetTrayectory: number[];
  }) {
    const colors: string[] = [];
    data.labels.forEach((label, index) => {
      if (parseInt(label) < this.currentYear) {
        colors.push('#DBDADA');
      } else {
        colors.push('#3598DB');
      }
    });

    const target = this.form.get('emissionReductionTarget')!.value || '0';

    this.stackedData = {
      labels: data.labels,
      datasets: [
        {
          type: 'bar',
          label: 'Forecast Emissions',
          backgroundColor: colors,
          stack: 'combined',
          data: data.forecastedEmissions,
          order: 2,
        },
        {
          type: 'bar',
          label: 'Offset',
          backgroundColor: ['#9B59B6'],
          stack: 'combined',
          data: data.forecastedOffset,
          order: 3,
        },
        {
          type: 'line',
          fill: false,
          label: 'Target trayectory',
          borderColor: '#FFA726',
          backgroundColor: '#FFA726',
          data: data.targetTrayectory,
          pointRadius: 0,
          order: 1,
        },
      ],
    };
  }

  private _updateChart() {
    this._chartDataService
      .getForecastEmissions('test_portfolio_id', this.form.getRawValue())
      .pipe(
        tap((res) => this._fillChartData(res)),
        take(1)
      )
      .subscribe((data) => {
        this.chart.data = this.stackedData;
        this.chart.update();
      });
  }
}
