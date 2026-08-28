using ERP.Api.Http;

namespace ERP.UnitTests;

public sealed class RequestIdMiddlewareTests
{
    [Theory]
    [InlineData("request-123", true)]
    [InlineData("trace:abc_def.1", true)]
    [InlineData("contains spaces", false)]
    [InlineData("", false)]
    public void ValidatesBoundedSafeRequestIds(string value, bool expected)
    {
        Assert.Equal(expected, RequestIdMiddleware.IsValid(value));
    }

    [Fact]
    public void RejectsOversizedRequestIds()
    {
        Assert.False(RequestIdMiddleware.IsValid(new string('a', 129)));
    }
}
