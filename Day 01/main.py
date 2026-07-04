from typing import List

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="Simple TODO API",
    description="메모리 리스트로 동작하는 초보자용 TODO API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TodoCreate(BaseModel):
    text: str = Field(..., min_length=1, description="할 일 내용")


class TodoUpdate(BaseModel):
    completed: bool = Field(..., description="완료 여부")


class Todo(BaseModel):
    id: int
    text: str
    completed: bool


# 데이터베이스 대신 메모리 리스트를 사용합니다.
# 서버를 껐다 켜면 이 목록은 사라집니다.
todos: List[Todo] = []
next_id = 1


def find_todo_index(todo_id: int) -> int:
    """id로 TODO의 위치를 찾습니다."""
    for index, todo in enumerate(todos):
        if todo.id == todo_id:
            return index
    return -1


@app.get("/")
def read_root():
    return {
        "message": "TODO API가 실행 중입니다.",
        "docs": "/docs",
        "endpoints": {
            "list": "GET /todos",
            "create": "POST /todos",
            "update_status": "PATCH /todos/{todo_id}",
            "delete": "DELETE /todos/{todo_id}",
        },
    }


@app.get("/todos", response_model=List[Todo])
def get_todos():
    """할 일 목록을 모두 조회합니다."""
    return todos


@app.post("/todos", response_model=Todo, status_code=status.HTTP_201_CREATED)
def create_todo(todo: TodoCreate):
    """새 할 일을 추가합니다."""
    global next_id

    text = todo.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="할 일 내용은 비어 있을 수 없습니다.")

    new_todo = Todo(id=next_id, text=text, completed=False)
    todos.append(new_todo)
    next_id += 1
    return new_todo


@app.patch("/todos/{todo_id}", response_model=Todo)
def update_todo_status(todo_id: int, update: TodoUpdate):
    """할 일의 완료 상태를 변경합니다."""
    index = find_todo_index(todo_id)

    if index == -1:
        raise HTTPException(status_code=404, detail="할 일을 찾을 수 없습니다.")

    todos[index].completed = update.completed
    return todos[index]


@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int):
    """할 일을 삭제합니다."""
    index = find_todo_index(todo_id)

    if index == -1:
        raise HTTPException(status_code=404, detail="할 일을 찾을 수 없습니다.")

    todos.pop(index)
    return None
