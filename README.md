# Nelly
What does Whoa Nelly mean?
Interjection. whoa, Nelly. an exclamation of surprise, especially one in response to an unexpected acceleration of speed.\
<img src="./images/nginx_animated.gif" alt="drawing" />

## What is Nelly?

Nelly is an NGINX <img src="./images/nginx.png" alt="drawing" height="25" width="50"/> plugin and suite that allows your organization to describe and implement your rate limits at the edge layer.  

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
Pushing rate limit to the "edge" layer, and giving it enough context to decision properly will allow uniform application of rates limits across all your 
products and services, and provide a central location for definition and configuration.   This makes it easier for your IT administration, product organization, and 
business organization to collaborate and set the definitions in a common and clear pattern.