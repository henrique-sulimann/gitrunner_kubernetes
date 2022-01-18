import express from "express";
import prom, { register } from "prom-client";
import axios from "axios";
import { S3 } from "aws-sdk";
const app = express();
const s3 = new S3({ region: "us-east-1" });
// Criando um Count no prometheus para fazer a contagem do número de requests
const counter = new prom.Counter({
  name: "request_counter",
  help: "Contador de Requests",
  labelNames: ["statusCode"],
});
app.get("/", (req, res) => {
  counter.labels("200").inc();
  res.json({
    counter_with_status: "status",
  });
});
app.get("/opa", (req, res) => {
  counter.inc();
  res.json({
    teste: "teste",
  });
});

// Realizando monitoramento com Gauge Metric (mais utilizado para medir memória, CPU, temperatura ou tudo que aumente e diminua o valor)

const gauge = new prom.Gauge({
  name: "gauge_free_bytes",
  help: "Exemplo Gauge",
});

app.get("/gauge", (req, res) => {
  gauge.set(100 * Math.random());
  res.send("Testando o Gauge Metrics!");
});

// Realizando monitoramento com Histogram Metric
const histogram = new prom.Histogram({
  name: "request_time_seconds",
  help: "Tempo de resposta da API",
  buckets: [100, 400, 500, 600, 700, 800, 900, 1200],
  /*
    buckets é qual será as metricas do nosso gráficos que iremos monitorar
    ou seja, nós iremos monitorar quantas requests foram menos de 100ms, quantas foram menor que 200 ms e assim por diante
    */
});
async function mid(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  console.log("entrou aqui");
  const originalSend = res.send;
  const beginTime = new Date().getTime();
  console.log(beginTime);

  const interceptorFunc = (body: any) => {
    const took = new Date().getTime() - beginTime;
    histogram.observe(took);
    summary.observe(took);
    console.log(took);
    originalSend.call(res, body);
  };
  // originalSend.call(res)
  res.send = interceptorFunc as any;
  next();
}
app.get("/histogram", mid, async (req, res) => {
  // const params = {
  //     BucketName: "whatsapp-container-backup"
  // }
  const buckets = await s3.listBuckets().promise();
  res.json({
    mensagem: "histogram metric, com interceptor para buscar a latência",
    buckets: buckets.Buckets,
  });
});

// Realizando monitoramento do Summary Metric
const summary = new prom.Summary({
  name: "summary_metric",
  help: "Tempo de resposta da API",
  percentiles: [0.1, 0.5, 0.9, 0.99],
});

app.get("/summary", mid, async (req, res) => {
  const buckets = await s3.listBuckets().promise();
  res.json({
    mensagem:
      "summary metric, com interceptor para buscar a porcentágel de latência",
    buckets: buckets.Buckets,
  });
});
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(4000, () => {
  console.log("testando");
});
