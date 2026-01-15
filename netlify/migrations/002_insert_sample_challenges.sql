-- Insert Sample Challenges for InternDesire Platform

-- Challenge 1: Array Sum (Today's Daily Challenge)
INSERT INTO challenges (
    title, 
    description, 
    difficulty, 
    tags, 
    input_format, 
    output_format, 
    constraints, 
    examples, 
    test_cases, 
    time_limit, 
    memory_limit, 
    supported_languages, 
    points, 
    is_daily, 
    publish_date, 
    created_by, 
    is_active
) VALUES 
(
    'Array Sum',
    'Given an array of integers, find the sum of all elements in the array.',
    'easy',
    '["array", "basic", "math"]',
    'First line contains n (number of elements)
Second line contains n space-separated integers',
    'Single integer representing the sum',
    '1 ≤ n ≤ 1000
-1000 ≤ array elements ≤ 1000',
    '[{"input": "5\\n1 2 3 4 5", "output": "15", "explanation": "1 + 2 + 3 + 4 + 5 = 15"}]',
    '[
        {"input": "5\\n1 2 3 4 5", "output": "15"},
        {"input": "3\\n-1 0 1", "output": "0"},
        {"input": "1\\n42", "output": "42"},
        {"input": "4\\n-5 -3 -2 -1", "output": "-11"},
        {"input": "6\\n10 20 30 40 50 60", "output": "210"}
    ]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    25,
    TRUE,
    CURRENT_DATE,
    2,
    TRUE
),

-- Challenge 2: Palindrome Check
(
    'Palindrome Checker',
    'Write a function to check if a given string is a palindrome. A palindrome reads the same forward and backward.',
    'easy',
    '["string", "palindrome", "basic"]',
    'Single line containing a string (only lowercase letters)',
    'true if palindrome, false otherwise',
    '1 ≤ string length ≤ 1000
String contains only lowercase letters a-z',
    '[
        {"input": "racecar", "output": "true", "explanation": "racecar reads the same forwards and backwards"},
        {"input": "hello", "output": "false", "explanation": "hello is not the same when reversed (olleh)"}
    ]',
    '[
        {"input": "racecar", "output": "true"},
        {"input": "hello", "output": "false"},
        {"input": "a", "output": "true"},
        {"input": "abcba", "output": "true"},
        {"input": "abcde", "output": "false"},
        {"input": "madam", "output": "true"},
        {"input": "python", "output": "false"}
    ]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    30,
    FALSE,
    CURRENT_DATE - INTERVAL '1 day',
    2,
    TRUE
),

-- Challenge 3: Fibonacci Sequence
(
    'Fibonacci Number',
    'Calculate the nth Fibonacci number. The Fibonacci sequence starts with 0, 1, and each subsequent number is the sum of the previous two.',
    'medium',
    '["dynamic-programming", "recursion", "fibonacci"]',
    'Single integer n (0-indexed)',
    'The nth Fibonacci number',
    '0 ≤ n ≤ 30',
    '[
        {"input": "0", "output": "0", "explanation": "F(0) = 0"},
        {"input": "1", "output": "1", "explanation": "F(1) = 1"},
        {"input": "6", "output": "8", "explanation": "F(6) = F(5) + F(4) = 5 + 3 = 8"}
    ]',
    '[
        {"input": "0", "output": "0"},
        {"input": "1", "output": "1"},
        {"input": "2", "output": "1"},
        {"input": "5", "output": "5"},
        {"input": "6", "output": "8"},
        {"input": "10", "output": "55"},
        {"input": "15", "output": "610"}
    ]',
    3000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    50,
    FALSE,
    CURRENT_DATE - INTERVAL '2 days',
    2,
    TRUE
),

-- Challenge 4: Maximum Subarray
(
    'Maximum Subarray Sum',
    'Find the contiguous subarray with the largest sum and return the sum. This is the classic Kadane''s algorithm problem.',
    'medium',
    '["array", "dynamic-programming", "kadane"]',
    'First line contains n (number of elements)
Second line contains n space-separated integers',
    'Maximum sum of any contiguous subarray',
    '1 ≤ n ≤ 1000
-1000 ≤ array elements ≤ 1000',
    '[
        {"input": "9\\n-2 1 -3 4 -1 2 1 -5 4", "output": "6", "explanation": "Subarray [4, -1, 2, 1] has sum = 6"},
        {"input": "1\\n-1", "output": "-1", "explanation": "Only one element"}
    ]',
    '[
        {"input": "9\\n-2 1 -3 4 -1 2 1 -5 4", "output": "6"},
        {"input": "1\\n-1", "output": "-1"},
        {"input": "5\\n1 2 3 4 5", "output": "15"},
        {"input": "3\\n-1 -2 -3", "output": "-1"},
        {"input": "6\\n5 -2 4 -1 3 -1", "output": "9"}
    ]',
    3000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    75,
    FALSE,
    CURRENT_DATE - INTERVAL '3 days',
    2,
    TRUE
),

-- Challenge 5: Binary Search
(
    'Binary Search Implementation',
    'Implement binary search algorithm to find the index of a target element in a sorted array. Return -1 if not found.',
    'medium',
    '["array", "binary-search", "algorithm"]',
    'First line: n (array size) and target
Second line: n sorted integers',
    'Index of target element (0-indexed) or -1 if not found',
    '1 ≤ n ≤ 1000
-10^6 ≤ array elements, target ≤ 10^6
Array is sorted in ascending order',
    '[
        {"input": "6 4\\n1 2 3 4 5 6", "output": "3", "explanation": "Element 4 is at index 3"},
        {"input": "5 7\\n1 3 5 9 11", "output": "-1", "explanation": "Element 7 is not in the array"}
    ]',
    '[
        {"input": "6 4\\n1 2 3 4 5 6", "output": "3"},
        {"input": "5 7\\n1 3 5 9 11", "output": "-1"},
        {"input": "1 5\\n5", "output": "0"},
        {"input": "4 1\\n1 2 3 4", "output": "0"},
        {"input": "3 10\\n5 8 12", "output": "-1"}
    ]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    60,
    FALSE,
    CURRENT_DATE - INTERVAL '4 days',
    2,
    TRUE
),

-- Challenge 6: String Reversal
(
    'Reverse Words in String',
    'Given a string with words separated by spaces, reverse the order of words while keeping individual words intact.',
    'easy',
    '["string", "array", "reverse"]',
    'Single line containing a string with words separated by single spaces',
    'String with words in reverse order',
    '1 ≤ string length ≤ 1000
Words separated by single spaces
No leading/trailing spaces',
    '[
        {"input": "hello world", "output": "world hello"},
        {"input": "the quick brown fox", "output": "fox brown quick the"}
    ]',
    '[
        {"input": "hello world", "output": "world hello"},
        {"input": "the quick brown fox", "output": "fox brown quick the"},
        {"input": "python", "output": "python"},
        {"input": "a b c", "output": "c b a"},
        {"input": "coding is fun", "output": "fun is coding"}
    ]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    35,
    FALSE,
    CURRENT_DATE - INTERVAL '5 days',
    2,
    TRUE
),

-- Challenge 7: Prime Number Check (Hard)
(
    'Prime Number Generator',
    'Generate all prime numbers up to n using the Sieve of Eratosthenes algorithm. Return them in ascending order.',
    'hard',
    '["math", "sieve", "prime", "algorithm"]',
    'Single integer n',
    'Space-separated prime numbers up to n',
    '2 ≤ n ≤ 1000',
    '[
        {"input": "10", "output": "2 3 5 7", "explanation": "All prime numbers ≤ 10"},
        {"input": "20", "output": "2 3 5 7 11 13 17 19", "explanation": "All prime numbers ≤ 20"}
    ]',
    '[
        {"input": "10", "output": "2 3 5 7"},
        {"input": "2", "output": "2"},
        {"input": "3", "output": "2 3"},
        {"input": "20", "output": "2 3 5 7 11 13 17 19"},
        {"input": "30", "output": "2 3 5 7 11 13 17 19 23 29"}
    ]',
    5000,
    512,
    '["python", "java", "cpp", "javascript", "go"]',
    100,
    FALSE,
    CURRENT_DATE - INTERVAL '6 days',
    2,
    TRUE
),

-- Challenge 8: Tomorrow's Daily Challenge
(
    'Count Vowels',
    'Count the number of vowels (a, e, i, o, u) in a given string. Case-insensitive.',
    'easy',
    '["string", "counting", "basic"]',
    'Single line containing a string',
    'Number of vowels in the string',
    '1 ≤ string length ≤ 1000
String may contain letters, numbers, and special characters',
    '[
        {"input": "Hello World", "output": "3", "explanation": "e, o, o are the vowels"},
        {"input": "Programming", "output": "3", "explanation": "o, a, i are the vowels"}
    ]',
    '[
        {"input": "Hello World", "output": "3"},
        {"input": "Programming", "output": "3"},
        {"input": "xyz", "output": "0"},
        {"input": "AEIOU", "output": "5"},
        {"input": "The Quick Brown Fox", "output": "5"},
        {"input": "12345", "output": "0"}
    ]',
    2000,
    256,
    '["python", "java", "cpp", "javascript", "go"]',
    20,
    TRUE,
    CURRENT_DATE + INTERVAL '1 day',
    2,
    TRUE
)
ON CONFLICT DO NOTHING;

-- Insert some sample submissions for the challenges
INSERT INTO submissions (user_id, challenge_id, language, code, status, execution_time, memory_used, score, test_results, submitted_at) VALUES
(3, 1, 'python', 'n = int(input())
arr = list(map(int, input().split()))
print(sum(arr))', 'accepted', 45, 1024, 25, '[]', CURRENT_TIMESTAMP),
(3, 2, 'python', 's = input().strip()
print("true" if s == s[::-1] else "false")', 'accepted', 32, 956, 30, '[]', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(3, 3, 'java', 'import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        if (n <= 1) {
            System.out.println(n);
            return;
        }
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        System.out.println(b);
    }
}', 'accepted', 78, 2048, 50, '[]', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;
