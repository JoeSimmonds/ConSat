use('sudoku');

db.reports.find({
    "runId": UUID("734e17d1-ba69-4b0d-89bd-3cca687f7d5b")
}, {parentSolutionId: 1, solutionId: 1}).limit(10);


