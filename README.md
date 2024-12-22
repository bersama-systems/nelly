# Nelly

What does Whoa Nelly mean?
Interjection. whoa, Nelly. an exclamation of surprise, especially one in response to an unexpected acceleration of speed.\
<img src="./images/horse.png" alt="drawing" />

## What is Nelly?

Nelly is an NGINX <img src="./images/nginx.png" alt="drawing" height="25" width="50"/> LUA code suite that allows your organization to describe and implement your rate limits at the edge layer.

## Why Rate Limit?

1. Resource Management: Rate limiting helps in preventing server overload and ensures that a system's resources are used efficiently. By limiting the number of requests, companies can avoid performance issues and maintain a smooth user experience.

1. Security: Rate limiting is a common strategy to protect against various types of attacks, including Distributed Denial of Service (DDoS) attacks. It helps in mitigating the impact of excessive traffic by restricting the rate at which requests are processed.

3. Fair Usage: Rate limiting can be implemented to ensure fair usage of resources among all users. It prevents any single user or application from monopolizing resources and ensures a level playing field for all users.

4. Cost Control: In cloud computing or other pay-as-you-go services, rate limiting can be used to control costs by limiting the number of API requests or interactions. This is especially relevant in scenarios where companies are charged based on the volume of requests.

5. Compliance: Some services or APIs have usage limits imposed by regulatory requirements or service providers. Rate limiting helps in ensuring compliance with these limits.

6. Quality of Service: By controlling the rate of incoming requests, companies can maintain a consistent quality of service for users. This is particularly important for services where timely and reliable responses are crucial.

7. Preventing Abuse: Rate limiting is an effective way to prevent abuse, misuse, or unauthorized access to services. It discourages malicious activities such as brute-force attacks or scraping.

8. Stability: Ensuring a steady and controlled flow of requests contributes to the overall stability of a system. Uncontrolled spikes in traffic can lead to service disruptions, and rate limiting helps in preventing such issues.

## Wait, why at Edge?

Glad you asked!\
Traditionally rate limits have started out at the controller layer of applications, and not at edge infrastructure.
Usually your organization (with remarkable success) has an oops moment and quickly reacts to the need of rate limiting and governance by implementing rate limiting
inside their flagship product.
Firms grow, add more products and services, break up monoliths, and pretty soon the organization finds itself in an unfavorable position
of having to re-implement rate limits across multiple products, multiple services and multiple languages.
Pushing rate limits to the "edge" layer, and giving it enough context to decision properly will allow uniform application of rate limits across all your
products and services, and provide a central location for definition and configuration.   This makes it easier for your IT administration, product organization, and
business organization to collaborate and set the definitions in a common and clear pattern. \
But my rate limiting at the controller has all the context it needs and at Edge it may not!  WRONG (or partially wrong).
With a few minor adjustments in that thinking, and some good code ^_^ you can implement very bespoke product rate limits at edge before it even hits your controller.
For example, if you want to only allow updates to a PARTICULAR entity five times within a second, because updates generate cascading events
that are taxing/onerous on the systems and downstream systems, you CAN capture that here.  REST patterns allow you to target that particular
condition among many more.  Look at the below configuration in the How it works section!

## DEMOS
[Conditional Rate Limits](https://youtu.be/VCC3krsdJyI)  
[Product Rate Limits](https://youtu.be/wbHslRlQCVE)  
[Plan Rate Limits](https://youtu.be/Li0eCmjm-5I)  

## How to run Nelly to test it out

### Prerequisistes

1. Docker (for docker compose)
2. A healthy understanding of service discovery
3. A healthy understanding of Redis and how it can be used as a global caching data store
4. A healthy understanding of nginx
5. A healthy understanding of bash ^_^

### Directions

in the root source directory execute:

```shell
cd src
./test.sh
```

The resultant should be something like:

```shell
joshuateitelbaum@Joshuas src % ./test.sh
[+] Running 7/7
 ✔ redis 6 layers [⣿⣿⣿⣿⣿⣿]      0B/0B      Pulled                                                                                                                                                        3.5s
   ✔ 83c5cfdaa538 Pull complete                                                                                                                                                                          0.8s
   ✔ af69b9847230 Pull complete                                                                                                                                                                          0.6s
.
.
.
 => [nginx internal] load .dockerignore                                                                                                                                                                  0.0s
 => => transferring context: 2B                                                                                                                                                                          0.0s
 => [nginx internal] load build definition from Dockerfile.nginx                                                                                                                                         0.0s
 => => transferring dockerfile: 535B                                                                                                                                                                     0.0s
 => [nginx internal] load metadata for docker.io/openresty/openresty:latest                                                                                                                              0.7s
                                                                                                                                   Started                                          0.0s
 ✔ Container nginx                                                                                                                                      Started                                          0.0s
 ! nginx The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested                                                  0.0s
NodeJS app and openresty responding and warmed up..... starting tests
Testing massive GETS on /api/example
Testing lower plan limit
Got off 60 requests for lower plan limit
Testing upper plan limit
Got off 300 requests for upper plan limit
*****Suite success!!!*****
```

Hey you know what's totally awesome?  Docker.  Even if you never installed any of this before Docker Compose is pretty
damn awesome.  If you run the tests without ever installing the images, it will still work!  It's all idempotent on run,
so the system will pull the images, install them, and run them based on the Dockerfiles supplied.  Dependencies are
also aptly set up as well.

## How it works

Have a look at [the limits json](./src/limits.json) \
I hope you find it interesting!!!\
It is!

```json
[
  {
    "limit_class" : "plan",
    "name": "Plan Limits",
    "short_name": "plan",
    "limit_key":  ["ngx.var.http_x_account_id"],
    "limits" : [
      {
        "condition" : {
          "name": "Plan Type 1",
          "lhs": "ngx.var.http_x_account_plan",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 300,
        "interval_seconds": 60
      },
      {
        "condition": {
          "name": "Fallback threshold for plans",
          "lhs": "1",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 5,
        "interval_seconds": 60
      }
    ]
  },
  {
    "limit_class" : "product",
    "name": "Limit on example controller endpoint (index)",
    "short_name": "example_controller_reads",
    "verb" : "GET",
    "uri" : "\/api\/example",
    "limit_key":  ["ngx.var.http_x_account_id", "ngx.var.request_method", "ngx.var.uri"],
    "limits" : [
      {
        "condition" : {
          "name": "Plan Type 1",
          "lhs": "ngx.var.http_x_account_plan",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 200,
        "interval_seconds": 60
      },
      {
        "condition": {
          "name": "Fallback threshold",
          "lhs": "1",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 60,
        "interval_seconds": 60
      }
    ]
  },
  {
    "limit_class" : "product",
    "name": "Limit on example controller with id (Show)",
    "short_name": "example_controller_shows",
    "verb" : "GET",
    "uri" : "\/api\/example\/\\d+",
    "limit_key":  ["ngx.var.http_x_account_id", "ngx.var.request_method", "ngx.var.uri"],
    "limits" : [
      {
        "condition" : {
          "name": "Plan Type 1",
          "lhs": "ngx.var.http_x_account_plan",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 300,
        "interval_seconds": 60
      },
      {
        "condition": {
          "name": "Fallback threshold",
          "lhs": "1",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 60,
        "interval_seconds": 60
      }
    ]
  },
  {
    "limit_class" : "product",
    "name": "Limit on example controller with id (Put update)",
    "short_name": "example_controller_writes",
    "verb" : "PUT",
    "uri" : "\/api\/example\/\\d+",
    "limit_key":  ["ngx.var.http_x_account_id", "ngx.var.request_method", "ngx.var.uri"],
    "limits" : [
      {
        "condition" : {
          "name": "Plan Type 1",
          "lhs": "ngx.var.http_x_account_plan",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 5,
        "interval_seconds": 1
      },
      {
        "condition": {
          "name": "Fallback threshold",
          "lhs": "1",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 1,
        "interval_seconds": 1
      }
    ]
  },
  {
    "limit_class" : "product",
    "name": "get ",
    "short_name": "composite_condition_reads",
    "verb" : "GET",
    "uri" : "\/api\/example\/composite_condition",
    "limit_key":  ["ngx.var.http_x_account_id", "ngx.var.request_method", "ngx.var.uri"],
    "limits" : [
      {
        "condition" : {
          "name": "Plan Type 1",
          "lhs": {
            "name": "Plan Type 1",
            "lhs": "ngx.var.http_x_account_plan",
            "operator": "eq",
            "rhs" : "1"
          },
          "operator": "or",
          "rhs" : {
            "name": "Plan Type 99",
            "lhs": "ngx.var.http_x_account_plan",
            "operator": "eq",
            "rhs" : "99"
          }
        },
        "threshold": 200,
        "interval_seconds": 60
      },
      {
        "condition": {
          "name": "Fallback threshold",
          "lhs": "1",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 60,
        "interval_seconds": 60
      }
    ]
  },
  {
    "limit_class" : "product",
    "name": "Wildcard Verb",
    "short_name": "wildcard_verb_controller",
    "uri" : "\/api\/wildcard_verb",
    "limit_key":  ["ngx.var.http_x_account_id", "ngx.var.uri"],
    "limits" : [
      {
        "condition" : {
          "name": "Plan Type 1",
          "lhs": {
            "name": "Plan Type 1",
            "lhs": "ngx.var.http_x_account_plan",
            "operator": "eq",
            "rhs" : "1"
          },
          "operator": "or",
          "rhs" : {
            "name": "Plan Type 99",
            "lhs": "ngx.var.http_x_account_plan",
            "operator": "eq",
            "rhs" : "99"
          }
        },
        "threshold": 200,
        "interval_seconds": 60
      },
      {
        "condition": {
          "name": "Fallback threshold",
          "lhs": "1",
          "operator": "eq",
          "rhs" : "1"
        },
        "threshold": 60,
        "interval_seconds": 60
      }
    ]
  }
]
```

* limit_class: the class of the limit.  Should assume one of four values: "product", "plan", "conditional", "allowlist"
* "product" and "plan" limits are in the same redis key "nelly_configuration"
* "conditional" limits are in a different redis node (since they are more volatile) "nelly_conditional_limits"
* "allowlist" limits are in "nelly_allowlist"
* name: the name of the limit configuration
* short_name: the short name that will go into the rate limit headers for explanation of what controller/action was hit
* verb: the HTTP verb that is part of the selector
* uri: the URI or path not including query parameters
* limit_key: how we UNIQUELY identify the counter in Redis. Note that it uses: Account ID (from headers), request method, and the URI
* condition: the "statement" that is evaluated dynamically (to a simple boolean ) in the limit to determine which limit to pick.  Conditions may contain other conditions or be a string to evaluate
* limits: array of plan based limits.  If an account is on the "higher" plan, it will get 300 requests per minute. Else, the default fallback condition will be used, or 60 requests per minute

General principles:

1. If present, the allowlist nodes will be evaluated first.  Absence of allowlist nodes fails OPEN.  If allowlist is enabled and a request does NOT match an allowlist rule, 404 ensues.
2. The engine will try to find a conditional rate limit that matches first. If a CRL is found, and violated, it's lights out at the onset.
2. The engine will try find the best plan match based on the incoming account information.  If found, the engine will apply the plan limit first.  If the plan limit passes, continue.
2. The engine will try to find the best product node match based on the incoming request URL and verb as indices (we don't want to iterate over 1000s of nodes for each request, so indexing on http verb and path is a really good idea)
3. The engine will employ the amalgamation key (seeded from pretend upper layers of authentication etc) and construct a redis key that uniquely identifies this customer on this node.
4. The engine will use redis to transact with the rate limit ledger
5. If limit thresholds have been exceeded it limits, otherwise it lets traffic through.
