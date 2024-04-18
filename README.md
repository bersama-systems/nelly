# Nelly
What does Whoa Nelly mean?
Interjection. whoa, Nelly. an exclamation of surprise, especially one in response to an unexpected acceleration of speed.\
<img src="./images/nginx_animated.gif" alt="drawing" />

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
business organization to collaborate and set the definitions in a common and clear pattern.

## How to run Nelly to test it out

### Prerequisistes
1. Docker (for docker compose)
2. A healthy understanding of service discovery
3. A healthy understanding of Redis and how it can be used as a global caching data store
4. A healthy understanding of nginx
5. A healthy understanding of bash ^_^


### Directions
in the root source diretory execute:
```shell
./test.sh
```

The resultant should be:
```shell
joshuateitelbaum@Joshuas src % ./test.sh
[+] Running 3/0
 ✔ Container redis   Running                                                                                                                                                                             0.0s 
 ✔ Container nodejs  Running                                                                                                                                                                             0.0s 
 ✔ Container nginx   Running                                                                                                                                                                             0.0s 
NodeJS app and openrest[+] Running 7/7
 ✔ redis 6 layers [⣿⣿⣿⣿⣿⣿]      0B/0B      Pulled                                                                                                                                                        3.5s 
   ✔ 83c5cfdaa538 Pull complete                                                                                                                                                                          0.7s 
   ✔ af69b9847230 Pull complete                                                                                                                                                                          0.3s 
   ✔ 47328343a4f2 Pull complete                                                                                                                                                                          0.4s 
   ✔ a8bdd61c4004 Pull complete                                                                                                                                                                          0.9s 
   ✔ 6cd44fea95ad Pull complete                                                                                                                                                                          0.8s 
   ✔ 797e3a88bf94 Pull complete                                                                                                                                                                          1.1s 
[+] Running 5/5
 ✔ Network sampleapp_default                                                                                                                            Created                                          0.0s 
 ✔ Container nodejs                                                                                                                                     Started                                          0.2s 
 ✔ Container redis                                                                                                                                      Started                                          0.2s 
 ✔ Container nginx                                                                                                                                      Started                                          0.1s 
 ! nginx The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested                                                  0.0s 
NodeJS app and openresty responding and warmed up..... starting tests
Testing massive GETS on /api/example
Testing lower plan limit
Got off 60 requests for lower plan limit
Testing upper plan limit
Got off 60 requests for upper plan limit
*****Suite success!!!*****

```

Hey you know what's totally awesome?  Docker.  Even if you never installed any of this before Docker Compose is pretty
damn awesome.  If you run the tests without ever installing the images, it will still work!  It's all idempotent on run,
so the system will pull the images, install them, and run them basked on the Dockerfiles supplied.  Dependencies are
also aptly set up as well.

