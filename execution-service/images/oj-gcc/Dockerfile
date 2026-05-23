# Custom GCC image with bits/stdc++.h precompiled as a PCH.
# Competitive programmers commonly include the GCC-specific
# <bits/stdc++.h> for convenience — but the header pulls in the
# entire C++ standard library, costing 25-35s of compile time per
# submission on a 1-vCPU host. Precompiling it once at image-build
# time makes subsequent includes ~10x faster.
#
# Build (once, on the host where exec-service runs):
#   docker build -t oj-gcc:latest execution-service/images/oj-gcc/

FROM gcc:latest

# Find the bits/ directory under the active GCC include path, then
# generate stdc++.h.gch alongside the source so g++ auto-picks it up
# on any subsequent #include <bits/stdc++.h>.
RUN STDH=$(find /usr/include -path "*bits/stdc++.h" | head -1) \
 && DIR=$(dirname "$STDH") \
 && cd "$DIR" \
 && g++ -std=c++17 stdc++.h -o stdc++.h.gch \
 && ls -lh stdc++.h.gch
