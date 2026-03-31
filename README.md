# Take home Flexer

## Project Structure

```
survey-api/
  SurveyApi.cs          ← C# ASP.NET Core 8 minimal API
  SurveyApi.csproj      ← Project file

survey-frontend/
  index.html            ← Survey UI
  style.css             ← Styles
  script.js             ← Ajax logic (fetch-based)
```

---

## Running the API

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download)

### Steps

```bash
cd survey-api
dotnet run
```

The API will start on **http://localhost:5050**

### Endpoints

| Method | Route            | Description                         |
|--------|------------------|-------------------------------------|
| GET    | /api/questions   | Returns 10 shuffled survey questions |
| POST   | /api/submit      | Accepts and validates survey answers |

---

## Running the Frontend

Open `survey-frontend/index.html` directly in your browser.

> **Note:** Make sure the API is running first, or the survey will show a retry screen.

To avoid CORS issues when testing locally, you can also serve the frontend with a simple server:

```bash
cd survey-frontend
npx serve .
# or
python3 -m http.server 8080
```

---

## Console Output Example

After a successful submission, open DevTools → Console to see:

```
📋 Survey Submission Result
  Submitted at: 2024-11-15T10:23:45.000Z
  Status: Survey submitted successfully.
  ▶ Full Response List
    Email Address: user@example.com
    ID Number: 9001015009087
    How many years of experience...? 5
    ...
```
