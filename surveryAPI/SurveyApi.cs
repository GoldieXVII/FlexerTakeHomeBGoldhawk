using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors();


//Hardcoded survey questions
var surveyQuestions = new List<Question>
{
    //Number questions with validation
    new Question { Id = 1, Type = "number", Text = "How many years of professional experience do you have?", Min = 0, Max = 50, Required = true },
    new Question { Id = 2, Type = "number", Text = "On a scale from 1 to 10, how satisfied are you with your current role?", Min = 1, Max = 10, Required = true },
    new Question { Id = 3, Type = "number", Text = "How many hours per week do you typically work?", Min = 1, Max = 168, Required = true },

    //Typed questions with validations
    new Question { Id = 4, Type = "text", Text = "What is your current job title?", Required = false },
    new Question { Id = 5, Type = "text", Text = "Describe your primary area of expertise.", Required = false },
    new Question { Id = 6, Type = "text", Text = "What is the name of your current employer or organisation?", Required = false },
    new Question { Id = 7, Type = "text", Text = "What skills would you most like to develop in the next year?", Required = false },
    new Question { Id = 8, Type = "text", Text = "What motivates you most in your work environment?", Required = false },

    //Date questions
    new Question { Id = 9, Type = "date", Text = "When did you start your current position?", Required = false },
    new Question { Id = 10, Type = "date", Text = "What is your date of birth?", Required = false },
};

//GET request
app.MapGet("/api/questions", () =>
{
    var shuffled = surveyQuestions.OrderBy(_ => Guid.NewGuid()).ToList();
    return Results.Json(shuffled, new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });
});

//POST request
app.MapPost("/api/submit", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();

    SurveySubmission? submission;
    try
    {
        submission = JsonSerializer.Deserialize<SurveySubmission>(body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
    catch
    {
        return Results.BadRequest(new { error = "Invalid JSON payload." });
    }

    if (submission == null)
        return Results.BadRequest(new { error = "Empty submission." });

    //Server side validation 
    if (string.IsNullOrWhiteSpace(submission.Email) || !submission.Email.Contains('@'))
        return Results.BadRequest(new { error = "Invalid email address." });

    if (string.IsNullOrWhiteSpace(submission.IdNumber) || submission.IdNumber.Length < 6)
        return Results.BadRequest(new { error = "Invalid ID number (minimum 6 characters)." });

    //Response List builder
    var formatted = new List<FormattedResponse>
    {
        new FormattedResponse { Field = "Email Address", Value = submission.Email },
        new FormattedResponse { Field = "ID Number",     Value = submission.IdNumber },
    };

    foreach (var answer in submission.Answers ?? new List<Answer>())
    {
        var question = surveyQuestions.FirstOrDefault(q => q.Id == answer.QuestionId);
        formatted.Add(new FormattedResponse
        {
            Field = question?.Text ?? $"Question {answer.QuestionId}",
            Value = answer.Value ?? "(no answer)"
        });
    }

    var result = new SubmissionResult
    {
        Success     = true,
        Message     = "Survey submitted successfully.",
        SubmittedAt = DateTime.UtcNow.ToString("o"),
        Responses   = formatted
    };

    return Results.Json(result, new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });
});

app.Run("http://localhost:5050");

//Models
public class Question
{
    public int    Id       { get; set; }
    public string Type     { get; set; } = "";
    public string Text     { get; set; } = "";
    public bool   Required { get; set; }
    public int?   Min      { get; set; }
    public int?   Max      { get; set; }
}

public class Answer
{
    public int     QuestionId { get; set; }
    public string? Value      { get; set; }
}

public class SurveySubmission
{
    public string?       Email    { get; set; }
    public string?       IdNumber { get; set; }
    public List<Answer>? Answers  { get; set; }
}

public class FormattedResponse
{
    public string Field { get; set; } = "";
    public string Value { get; set; } = "";
}

public class SubmissionResult
{
    public bool                  Success     { get; set; }
    public string                Message     { get; set; } = "";
    public string                SubmittedAt { get; set; } = "";
    public List<FormattedResponse> Responses { get; set; } = new();
}
