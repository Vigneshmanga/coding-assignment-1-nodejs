const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const isValid = require("date-fns/isValid");

const { format } = require("date-fns");

app.use(express.json());
const pathDb = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDbAndServer = async () => {
  db = await open({
    filename: pathDb,
    driver: sqlite3.Database,
  });
  app.listen(3000, () => {
    console.log("server running at 3000");
  });
};

const checkTheData2 = (request, response, next) => {
  const { id, priority, status, category, dueDate } = request.body;
  let dueDateLength;
  if (dueDate !== undefined) {
    dueDateLength = dueDate.split("-").length;
  }
  if (
    status !== undefined &&
    !(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority !== undefined &&
    !(priority === "HIGH" || priority === "LOW" || priority === "MEDIUM")
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category !== undefined &&
    !(category === "WORK" || category === "HOME" || category === "LEARNING")
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (dueDateLength !== 3 && dueDateLength !== undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

const checkTheData = (request, response, next) => {
  const { status, priority, search_q, category, dueDate } = request.query;

  if (
    status !== undefined &&
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority !== undefined &&
    priority !== "HIGH" &&
    priority !== "LOW" &&
    priority !== "MEDIUM"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category !== undefined &&
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }
};

initializeDbAndServer();

const convertTodo = (obj) => ({
  id: obj.id,
  todo: obj.todo,
  category: obj.category,
  priority: obj.priority,
  status: obj.status,
  dueDate: obj.due_date,
});

//api 1

app.get("/todos/", checkTheData, async (request, response) => {
  const { status, priority, search_q, category } = request.query;
  let query;
  const case1 =
    status !== undefined &&
    priority === undefined &&
    search_q === undefined &&
    category === undefined; //status
  const case2 =
    status === undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category === undefined; //priority
  const case3 =
    status !== undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category === undefined; //status and priority
  const case4 =
    status === undefined &&
    priority === undefined &&
    search_q !== undefined &&
    category === undefined; //search_q
  const case5 =
    status !== undefined &&
    priority === undefined &&
    search_q === undefined &&
    category !== undefined; //status and category
  const case6 =
    status === undefined &&
    priority === undefined &&
    search_q === undefined &&
    category !== undefined; //category
  const case7 =
    status === undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category !== undefined; //priority and category
  if (case1) {
    const convertedStatus = status.replace("%20", " ");
    query = `
        select * from todo
        where status = '${convertedStatus}'`;
  } else if (case2) {
    query = `
        select * from todo where priority = '${priority}'`;
  } else if (case3) {
    const convertedStatus = status.replace("%20", " ");
    query = `
        select * from todo
        where status = '${convertedStatus}' and priority = '${priority}'`;
  } else if (case4) {
    const convertedSearchQ = search_q.replace("%20", " ");
    query = `
        select * from todo where todo like '%${convertedSearchQ}%'`;
  } else if (case5) {
    const convertedStatus = status.replace("%20", " ");
    query = `
        select * from todo
        where status = '${convertedStatus}' and category = '${category}'`;
  } else if (case6) {
    query = `
        select * from todo
        where category = '${category}'`;
  } else if (case7) {
    query = `
        select * from todo
        where priority = '${priority}' and category = '${category}'`;
  }
  const dbResponse = await db.all(query);
  let todoArray = [];
  for (let item of dbResponse) {
    todoArray.push(convertTodo(item));
  }
  response.send(todoArray);
});

//api 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `
    select * from todo
    where id = ${todoId}`;
  const dbResponse = await db.get(query);
  response.send(convertTodo(dbResponse));
});

//api 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  let arr = date.split("-");

  let Ndate;
  if (arr.length === 3) {
    arr = [parseInt(arr[0]), parseInt(arr[1]) - 1, parseInt(arr[2])];
    Ndate = format(new Date(arr[0], arr[1], arr[2]), "yyyy-MM-dd");
    let isvalidDate = isValid(new Date(arr[0], arr[1], arr[2]));
    if (isvalidDate) {
      const query = `
    select * from todo where due_date = '${Ndate}'`;
      const dbResponse = await db.all(query);
      let todoArray = [];
      for (let item of dbResponse) {
        todoArray.push(convertTodo(item));
      }
      response.send(todoArray);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// api 4

app.post("/todos/", checkTheData2, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const query = `
    insert into todo 
    values 
    (${id},'${todo}','${priority}','${status}','${category}','${dueDate}')`;
  await db.run(query);
  response.send("Todo Successfully Added");
});

//api 5

app.put("/todos/:todoId/", checkTheData2, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  let toBeChange = null;
  let a = null;
  let message = null;

  if (status !== undefined) {
    toBeChange = status.replace("%20", " ");
    a = "status";
    message = "Status Updated";
  } else if (priority !== undefined) {
    toBeChange = priority;
    a = "priority";
    message = "Priority Updated";
  } else if (todo !== undefined) {
    toBeChange = todo;
    a = "todo";
    message = "Todo Updated";
  } else if (category !== undefined) {
    toBeChange = category;
    a = "category";
    message = "Category Updated";
  } else if (dueDate !== undefined) {
    toBeChange = dueDate;
    a = "due_date";
    message = "Due Date Updated";
  }
  let query = `
  update todo
  set 
  ${a} = '${toBeChange}'`;
  await db.run(query);
  response.send(message);
});

//api 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `
    delete from todo
    where id = ${todoId}`;
  await db.run(query);
  response.send("Todo Deleted");
});

module.exports = app;
