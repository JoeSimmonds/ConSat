import Koa from "koa"
import Router from "koa-router"
import * as path from "path"
import nj from "nunjucks"
import mongo, {UUID} from "mongodb"
import serve from "koa-static"

const app = new Koa();
const mongoClient = new mongo.MongoClient("mongodb://localhost:27017")
const router = new Router()

interface Run {
    runId: UUID;
    timestamp: Date;
}

interface Report {
    runId: UUID;
    parentSolutionId: UUID;
    solutionId: UUID;
}

nj.configure(path.join(import.meta.dirname, "views"))

app.use(serve(path.join(import.meta.dirname, "public")))

async function getRuns(): Promise<Run[]> {
    const db = mongoClient.db("sudoku")
    const runs = db.collection("runs")
    const cursor = runs.find()
    const documents = await cursor.toArray()
    return documents.map(doc => ({
        runId: doc.runId,
        timestamp: doc.timestamp
    }))
}

async function getReportData(runId: UUID): Promise<Report[]> {
    const db = mongoClient.db("sudoku")
    const reports = db.collection("reports")
    const cursor = reports.find({runId: runId}, {projection: {parentSolutionId: 1, solutionId: 1}}).limit(100)
    const documents = await cursor.toArray()
    return documents.map(doc => ({
        runId: doc.runId,
        parentSolutionId: doc.parentSolutionId,
        solutionId: doc.solutionId
    }))
}

router.get("/", ctx => {
        ctx.response.status = 303
        ctx.response.set("location", "runs")
    })
    .get("/runs", async ctx => {
        const runs = await getRuns()
        ctx.response.body = nj.render("runs.nj.html", {runs})
    })
    .get("/reports/:id", async ctx => {
        const reports = await getReportData(new UUID(ctx.params.id))
        ctx.response.body = nj.render("reports.nj.html", {reports})
    })

app.use(router.routes())

app.listen(3030)